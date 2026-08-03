import { collectionType } from "#backend/db";
import { emitCollectionEvent, emitEntryEvent } from "#backend/events";
import { authorized, base } from "#backend/lib/transport";
import { id } from "#backend/lib/primitives";
import { collectionName } from "#backend/lib/validation";
import { Collections } from "#backend/services/collections";
import * as z from "zod";

const collectionsRouter = base.prefix("/collections").router({
  create: base
    .route({ method: "POST", path: "/" })
    .meta({
      required: {
        session: ["content"],
        key: ["collections"]
      }
    })
    .use(authorized)
    .input(
      collectionType
        .pick({ id: true, name: true })
        .extend({
          parentID: id().describe("ID of the parent collection,")
        })
        .partial()
    )
    .output(collectionType)
    .handler(async ({ context, input }) => {
      const newCollection = await Collections.create({
        ...input,
        workspaceID: context.auth.workspaceID
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:create",
        memberID: context.auth.session?.memberID,
        data: newCollection
      });

      return newCollection;
    }),
  delete: base
    .route({ method: "DELETE", path: "/" })
    .meta({
      required: {
        session: ["content"],
        key: ["collections"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        ids: z.array(id()).describe("Comma-separated IDs of the collections to be deleted")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const deleted = await Collections.delete({
        workspaceID: context.auth.workspaceID,
        ids: input.ids
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:delete",
        data: { ids: deleted.collectionIDs },
        memberID: context.auth.session?.memberID
      });

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
        session: ["content"],
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
  move: base
    .meta({
      required: {
        session: ["content"]
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
          .describe("New zero-based index in the parent collection's descendants array")
      })
    )
    .output(z.void())

    .handler(async ({ context, input }) => {
      const result = await Collections.move({
        id: input.id,
        workspaceID: context.auth.workspaceID,
        newParentID: input.newParentID,
        index: input.index
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:move",
        data: {
          id: input.id,
          newParentID: result.newParentID,
          index: result.index
        },
        memberID: context.auth.session?.memberID
      });
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
        perPage: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Number of collections per page"),
        page: z.number().int().min(1).max(1e6).optional().describe("Page number")
      })
    )
    .use(authorized)
    .output(z.array(collectionType))
    .handler(async ({ context, input }) => {
      const { collections } = await Collections.list({
        workspaceID: context.auth.workspaceID,
        ancestorID: input.ancestorID,
        perPage: input.perPage,
        page: input.page
      });

      return collections;
    })
});

export { collectionsRouter };
