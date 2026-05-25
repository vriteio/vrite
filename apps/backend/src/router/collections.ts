import { collectionType } from "#backend/db";
import { emitCollectionEvent } from "#backend/events";
import { authorized } from "#backend/lib/middleware";
import { objectID } from "#backend/lib/mongo";
import { base } from "#backend/lib/orpc";
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
    .input(collectionType.omit({ id: true }).partial())
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
        ids: z.array(objectID()).describe("Comma-separated IDs of the collections to be deleted")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Collections.delete({
        workspaceID: context.auth.workspaceID,
        ids: input.ids
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:delete",
        data: { ids: input.ids },
        memberID: context.auth.session?.memberID
      });
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
        id: objectID().describe("ID of the collection to be updated"),
        name: z.string().optional().describe("New name of the collection")
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
    .route({ method: "PUT", path: "/move/{id}" })
    .meta({
      required: {
        session: ["content"],
        key: ["collections"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        id: objectID().describe("ID of the collection to be moved"),
        newParentID: objectID()
          .nullable()
          .optional()
          .describe("ID of the new parent collection, or null for root")
      })
    )
    .output(z.void())

    .handler(async ({ context, input }) => {
      await Collections.move({
        id: input.id,
        workspaceID: context.auth.workspaceID,
        newParentID: input.newParentID
      });

      emitCollectionEvent(context.auth.workspaceID, {
        action: "collection:move",
        data: {
          id: input.id,
          newParentID: input.newParentID
        },
        memberID: context.auth.session?.memberID
      });
    }),
  list: base
    .route({ method: "GET", path: "/list" })
    .meta({
      required: {
        key: ["read:collections"]
      }
    })
    .input(
      z.object({
        ancestorID: z.string().optional().describe("ID of the parent collection"),
        perPage: z.number().optional().describe("Number of collections to get per page"),
        page: z.number().optional().describe("Page number")
      })
    )
    .use(authorized)
    .output(z.array(collectionType))
    .handler(async ({ context, input }) => {
      return Collections.list({
        workspaceID: context.auth.workspaceID,
        ancestorID: input.ancestorID,
        perPage: input.perPage,
        page: input.page
      });
    })
});

export { collectionsRouter };
