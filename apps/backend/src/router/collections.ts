import { collectionType } from "#backend/db";
import {
  emitCollectionEvent,
  emitEntryEvent,
  emitGroupEvent,
  emitPublishingEntryUpdates,
  emitPublishingEvent
} from "#backend/events";
import { authenticatedRoute, base, sessionRoute } from "#backend/lib/transport";
import { id } from "#backend/lib/primitives";
import {
  enqueueCurrentCollectionSync,
  enqueueCurrentEntrySync,
  enqueuePublishedCollectionSync,
  enqueuePublishedEntrySync
} from "#backend/lib/queue";
import { collectionName } from "#backend/lib/validation";
import { Collections } from "#backend/services/collections";
import * as z from "zod";

const collectionListType = z.object({
  data: z.array(collectionType),
  pagination: z.object({
    nextCursor: id().nullable(),
    hasMore: z.boolean()
  })
});
const restrictedGroupAssignmentType = z.object({
  groupID: id(),
  roleID: id()
});
const restrictedMemberAssignmentType = z.object({
  memberID: id(),
  roleID: id()
});
const restrictedAssignmentsType = z.object({
  groups: z.array(restrictedGroupAssignmentType),
  members: z.array(restrictedMemberAssignmentType)
});

const collectionsRouter = base.prefix("/collections").router({
  listRestrictedAssignments: sessionRoute
    .route({ method: "GET", path: "/:id/restricted-assignments" })
    .input(z.object({ id: collectionType.shape.id }))
    .output(restrictedAssignmentsType)
    .handler(({ context, input }) => {
      return Collections.listRestrictedAssignments({
        auth: context.auth,
        collectionID: input.id
      });
    }),
  setRestrictedAssignments: sessionRoute
    .route({ method: "PUT", path: "/:id/restricted-assignments" })
    .input(z.object({ id: collectionType.shape.id }).extend(restrictedAssignmentsType.shape))
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { affectedUserIDs } = await Collections.setRestrictedAssignments({
        auth: context.auth,
        collectionID: input.id,
        groups: input.groups,
        members: input.members
      });

      emitGroupEvent(context.auth.workspaceID, {
        action: "restricted-assignments:update",
        affectedUserIDs,
        memberID: context.auth.session?.memberID,
        data: { collectionID: input.id }
      });
    }),
  create: authenticatedRoute
    .route({ method: "POST", path: "/" })
    .input(
      collectionType
        .pick({ id: true, name: true })
        .extend({
          parentID: id().describe("ID of the parent collection,"),
          restricted: z.boolean().describe("Whether to restrict access to the collection tree")
        })
        .partial()
    )
    .output(collectionType)
    .handler(async ({ context, input }) => {
      const newCollection = await Collections.create({
        ...input,
        auth: context.auth
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:create",
        memberID: context.auth.session?.memberID,
        data: newCollection
      });

      return newCollection;
    }),
  bulkDelete: authenticatedRoute
    .route({ method: "POST", path: "/bulk/delete" })
    .input(
      z.object({
        ids: z.array(id()).describe("IDs of the collections to delete")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const deleted = await Collections.delete({
        auth: context.auth,
        ids: input.ids
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:delete",
        data: { ids: deleted.collectionIDs },
        memberID: context.auth.session?.memberID
      });

      for (const collectionID of deleted.collectionIDs) {
        emitPublishingEvent(context.auth.workspaceID, {
          action: "publishing:collection-update",
          data: { id: collectionID, enabled: false },
          memberID: context.auth.session?.memberID
        });
      }

      if (deleted.entryIDs.length > 0) {
        emitEntryEvent(context.auth.workspaceID, {
          action: "entry:delete",
          data: { ids: deleted.entryIDs },
          memberID: context.auth.session?.memberID
        });
        await Promise.all([
          enqueueCurrentEntrySync({
            workspaceID: context.auth.workspaceID,
            entryIDs: deleted.entryIDs
          }),
          enqueuePublishedEntrySync({
            workspaceID: context.auth.workspaceID,
            entryIDs: deleted.entryIDs
          })
        ]);
      }
    }),
  delete: authenticatedRoute
    .route({ method: "DELETE", path: "/:id" })
    .input(
      z.object({
        id: id().describe("ID of the collection to delete")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const deleted = await Collections.delete({
        auth: context.auth,
        ids: [input.id]
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:delete",
        data: { ids: deleted.collectionIDs },
        memberID: context.auth.session?.memberID
      });

      for (const collectionID of deleted.collectionIDs) {
        emitPublishingEvent(context.auth.workspaceID, {
          action: "publishing:collection-update",
          data: { id: collectionID, enabled: false },
          memberID: context.auth.session?.memberID
        });
      }

      if (deleted.entryIDs.length > 0) {
        emitEntryEvent(context.auth.workspaceID, {
          action: "entry:delete",
          data: { ids: deleted.entryIDs },
          memberID: context.auth.session?.memberID
        });
        await Promise.all([
          enqueueCurrentEntrySync({
            workspaceID: context.auth.workspaceID,
            entryIDs: deleted.entryIDs
          }),
          enqueuePublishedEntrySync({
            workspaceID: context.auth.workspaceID,
            entryIDs: deleted.entryIDs
          })
        ]);
      }
    }),
  update: authenticatedRoute
    .route({ method: "PUT", path: "/:id" })
    .input(
      z.object({
        id: id().describe("ID of the collection to be updated"),
        name: collectionName().optional().describe("New name of the collection")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Collections.update({
        auth: context.auth,
        id: input.id,
        name: input.name
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:update",
        data: { id: input.id, name: input.name },
        memberID: context.auth.session?.memberID
      });

      if (input.name !== undefined) {
        await Promise.all([
          enqueueCurrentCollectionSync({
            workspaceID: context.auth.workspaceID,
            collectionID: input.id
          }),
          enqueuePublishedCollectionSync({
            workspaceID: context.auth.workspaceID,
            collectionID: input.id
          })
        ]);
      }
    }),
  setRestricted: sessionRoute
    .route({ method: "PUT", path: "/:id/restricted" })
    .input(
      z.object({
        id: id().describe("ID of the collection to configure"),
        restricted: z.boolean().describe("Whether to restrict access to the collection tree")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Collections.setRestricted({
        auth: context.auth,
        id: input.id,
        restricted: input.restricted
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:update",
        data: { id: input.id, restricted: input.restricted },
        memberID: context.auth.session?.memberID
      });
      await enqueueCurrentCollectionSync({
        workspaceID: context.auth.workspaceID,
        collectionID: input.id
      });
    }),
  move: sessionRoute
    .input(
      z.object({
        id: id().describe("ID of the collection to be moved"),
        newParentID: id()
          .nullable()
          .optional()
          .describe("ID of the new parent collection, or null for the top level"),
        index: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("New zero-based index in the parent collection's descendants array")
      })
    )
    .output(z.void())

    .handler(async ({ context, input }) => {
      const result = await Collections.move({
        auth: context.auth,
        id: input.id,
        newParentID: input.newParentID,
        index: input.index
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:move",
        data: {
          id: input.id,
          newParentID: result.newParentID,
          index: result.index,
          restrictedBoundaryChanged: result.restrictedBoundaryChanged
        },
        memberID: context.auth.session?.memberID
      });

      if (input.newParentID !== undefined) {
        await Promise.all([
          enqueueCurrentCollectionSync({
            workspaceID: context.auth.workspaceID,
            collectionID: input.id
          }),
          enqueuePublishedCollectionSync({
            workspaceID: context.auth.workspaceID,
            collectionID: input.id
          })
        ]);
      }

      if (result.publishingEntries.length > 0) {
        emitPublishingEntryUpdates({
          workspaceID: context.auth.workspaceID,
          entries: result.publishingEntries,
          memberID: context.auth.session?.memberID
        });
      }
    }),
  list: authenticatedRoute
    .route({ method: "GET", path: "/list" })
    .input(
      z.object({
        ancestorID: id().optional().describe("ID of the parent collection"),
        cursor: id().optional().describe("Cursor from the previous page"),
        limit: z.number().int().min(1).max(100).optional().describe("Maximum collections to return")
      })
    )
    .output(collectionListType)
    .handler(async ({ context, input }) => {
      const { collections, nextCursor } = await Collections.list({
        auth: context.auth,
        ancestorID: input.ancestorID,
        cursor: input.cursor,
        limit: input.limit
      });

      return {
        data: collections,
        pagination: {
          nextCursor,
          hasMore: nextCursor !== null
        }
      };
    })
});

export { collectionsRouter };
