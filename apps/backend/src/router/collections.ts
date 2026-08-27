import { collectionType } from "#backend/db";
import {
  emitCollectionEvent,
  emitEntryEvent,
  emitGroupEvent,
  emitPublishingEvent,
  emitVersionCreationEvents
} from "#backend/events";
import { authorized, base } from "#backend/lib/transport";
import { id } from "#backend/lib/primitives";
import { collectionName } from "#backend/lib/validation";
import { emitPublishingStatusUpdates } from "#backend/lib/publishing";
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
  listRestrictedAssignments: base
    .route({ method: "GET", path: "/:id/restricted-assignments" })
    .meta({
      requireProPlan: true,
      required: { session: ["workspace", "restricted_collections"] }
    })
    .use(authorized)
    .input(z.object({ id: collectionType.shape.id }))
    .output(restrictedAssignmentsType)
    .handler(({ context, input }) => {
      return Collections.listRestrictedAssignments({
        collectionID: input.id,
        workspaceID: context.auth.workspaceID
      });
    }),
  setRestrictedAssignments: base
    .route({ method: "PUT", path: "/:id/restricted-assignments" })
    .meta({
      requireProPlan: true,
      required: { session: ["workspace", "restricted_collections"] }
    })
    .use(authorized)
    .input(z.object({ id: collectionType.shape.id }).extend(restrictedAssignmentsType.shape))
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { affectedUserIDs } = await Collections.setRestrictedAssignments({
        collectionID: input.id,
        groups: input.groups,
        members: input.members,
        workspaceID: context.auth.workspaceID
      });

      emitGroupEvent(context.auth.workspaceID, {
        action: "restricted-assignments:update",
        affectedUserIDs,
        memberID: context.auth.session?.memberID,
        data: { collectionID: input.id }
      });
    }),
  create: base
    .route({ method: "POST", path: "/" })
    .meta({
      required: {
        session: true,
        key: ["collections"]
      }
    })
    .use(authorized)
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
        auth: context.auth,
        workspaceID: context.auth.workspaceID
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:create",
        memberID: context.auth.session?.memberID,
        data: newCollection
      });

      return newCollection;
    }),
  bulkDelete: base
    .route({ method: "POST", path: "/bulk/delete" })
    .meta({
      required: {
        session: true,
        key: ["collections"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        ids: z.array(id()).describe("IDs of the collections to delete")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const deleted = await Collections.delete({
        auth: context.auth,
        workspaceID: context.auth.workspaceID,
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
      }
    }),
  delete: base
    .route({ method: "DELETE", path: "/:id" })
    .meta({
      required: {
        session: true,
        key: ["collections"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        id: id().describe("ID of the collection to delete")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const deleted = await Collections.delete({
        auth: context.auth,
        workspaceID: context.auth.workspaceID,
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
      }
    }),
  update: base
    .route({ method: "PUT", path: "/:id" })
    .meta({
      required: {
        session: true,
        key: ["collections"]
      }
    })
    .use(authorized)
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
        workspaceID: context.auth.workspaceID,
        name: input.name
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:update",
        data: { id: input.id, name: input.name },
        memberID: context.auth.session?.memberID
      });
    }),
  setRestricted: base
    .route({ method: "PUT", path: "/:id/restricted" })
    .meta({
      required: {
        session: ["restricted_collections"]
      }
    })
    .use(authorized)
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
        restricted: input.restricted,
        workspaceID: context.auth.workspaceID
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:update",
        data: { id: input.id, restricted: input.restricted },
        memberID: context.auth.session?.memberID
      });
    }),
  move: base
    .meta({
      required: {
        session: true
      }
    })
    .use(authorized)
    .input(
      z.object({
        id: id().describe("ID of the collection to be moved"),
        newParentID: id()
          .nullable()
          .optional()
          .describe("ID of the new parent collection, or null for root"),
        index: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("New zero-based index in the parent collection's descendants array"),
        publish: z
          .boolean()
          .optional()
          .describe("Whether to publish latest versions when entering an enabled tree")
      })
    )
    .output(z.void())

    .handler(async ({ context, input }) => {
      const result = await Collections.move({
        auth: context.auth,
        id: input.id,
        workspaceID: context.auth.workspaceID,
        newParentID: input.newParentID,
        index: input.index,
        publish: input.publish,
        contributorIDs: context.auth.session ? [context.auth.session.memberID] : []
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

      if (result.affectedPublishingEntryIDs.length > 0) {
        await emitPublishingStatusUpdates({
          workspaceID: context.auth.workspaceID,
          entryIDs: result.affectedPublishingEntryIDs,
          memberID: context.auth.session?.memberID
        });
      }

      emitVersionCreationEvents(
        context.auth.workspaceID,
        result.createdVersions,
        context.auth.session?.memberID
      );
    }),
  list: base
    .route({ method: "GET", path: "/list" })
    .meta({
      required: {
        key: ["read:collections"],
        session: true
      }
    })
    .input(
      z.object({
        ancestorID: id().optional().describe("ID of the parent collection"),
        cursor: id().optional().describe("Cursor from the previous page"),
        limit: z.number().int().min(1).max(100).optional().describe("Maximum collections to return")
      })
    )
    .use(authorized)
    .output(collectionListType)
    .handler(async ({ context, input }) => {
      const { collections, nextCursor } = await Collections.list({
        auth: context.auth,
        workspaceID: context.auth.workspaceID,
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
