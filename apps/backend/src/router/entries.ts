import { entryType } from "#backend/db";
import { emitEntryEvent } from "#backend/events";
import { authorized } from "#backend/lib/middleware";
import { id } from "#backend/lib/mongo";
import { base } from "#backend/lib/orpc";
import { Entries } from "#backend/services/entries";
import * as z from "zod";

const entriesRouter = base.prefix("/entries").router({
  create: base
    .route({ method: "POST", path: "/" })
    .meta({
      required: {
        session: ["content"],
        key: ["entries"]
      }
    })
    .use(authorized)
    .input(entryType.omit({ order: true }).partial())
    .output(entryType)
    .handler(async ({ context, input }) => {
      const newEntry = await Entries.create({
        ...input,
        workspaceID: context.auth.workspaceID
      });

      emitEntryEvent(context.auth.workspaceID, {
        action: "entry:create",
        memberID: context.auth.session?.memberID,
        data: newEntry
      });

      return newEntry;
    }),
  delete: base
    .route({ method: "DELETE", path: "/" })
    .meta({
      required: {
        session: ["content"],
        key: ["entries"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        ids: z.array(id()).describe("Comma-separated IDs of the entries to be deleted")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Entries.delete({
        workspaceID: context.auth.workspaceID,
        ids: input.ids
      });

      emitEntryEvent(context.auth.workspaceID, {
        action: "entry:delete",
        data: { ids: input.ids },
        memberID: context.auth.session?.memberID
      });
    }),
  update: base
    .route({ method: "PUT", path: "/:id" })
    .meta({
      required: {
        session: ["content"],
        key: ["entries"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        id: id().describe("ID of the entry to be updated"),
        name: z.string().optional().describe("New name of the entry")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Entries.update({
        id: input.id,
        workspaceID: context.auth.workspaceID,
        name: input.name
      });

      emitEntryEvent(context.auth.workspaceID, {
        action: "entry:update",
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
    .input(
      z.object({
        id: id().describe("ID of the entry to be moved"),
        order: z.string().describe("New LexoRank order of the entry"),
        collectionID: id().optional().nullable().describe("ID of the new parent collection")
      })
    )
    .use(authorized)
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Entries.move({
        id: input.id,
        workspaceID: context.auth.workspaceID,
        order: input.order,
        collectionID: input.collectionID
      });
      emitEntryEvent(context.auth.workspaceID, {
        action: "entry:move",
        data: {
          id: input.id,
          order: input.order,
          collectionID: input.collectionID
        },
        memberID: context.auth.session?.memberID
      });
    }),
  list: base
    .route({ method: "GET", path: "/list" })
    .meta({
      required: {
        key: ["read:entries"],
        session: true
      }
    })
    .use(authorized)
    .input(
      z.object({
        collectionID: z.string().optional().describe("ID of the collection to get entries from"),
        lastOrder: z.string().optional().describe("Last order to get entries from"),
        perPage: z.number().optional().describe("Number of entries to get per page"),
        page: z.number().optional().describe("Page number")
      })
    )
    .output(z.array(entryType))
    .handler(async ({ context, input }) => {
      return Entries.list({
        workspaceID: context.auth.workspaceID,
        collectionID: input.collectionID,
        lastOrder: input.lastOrder,
        perPage: input.perPage,
        page: input.page
      });
    })
});

export { entriesRouter };
