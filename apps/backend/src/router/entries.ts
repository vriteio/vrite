import { entryType, lexoRank } from "#backend/db";
import { updateDocumentTitle } from "#backend/collaboration";
import { emitEntryEvent, emitPublishingEntryUpdates } from "#backend/events";
import { authenticatedRoute, base, sessionRoute } from "#backend/lib/transport";
import { contentNodeType } from "#backend/lib/content";
import { id } from "#backend/lib/primitives";
import { entryName } from "#backend/lib/validation";
import { Entries } from "#backend/services/entries";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

const entryDetailsType = entryType.extend({
  updatedAt: z.iso.datetime().describe("Time when the entry content was last updated"),
  content: contentNodeType,
  fragments: z.record(
    z.string(),
    z.object({
      name: z.string().describe("Source fragment name"),
      content: contentNodeType
    })
  ),
  properties: z.record(
    z.string(),
    z.object({
      name: z.string().describe("Source property name"),
      type: z
        .enum(["text", "number", "checkbox", "date", "url", "select", "multi-select"])
        .describe("Property type"),
      value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])
    })
  )
});
const entryListType = z.object({
  data: z.array(entryType),
  pagination: z.object({
    nextCursor: id().nullable(),
    hasMore: z.boolean()
  })
});

const entriesRouter = base.prefix("/entries").router({
  create: authenticatedRoute
    .route({ method: "POST", path: "/" })
    .input(entryType.omit({ order: true }).partial())
    .output(entryType)
    .handler(async ({ context, input }) => {
      const { entry: newEntry, publishingEntries } = await Entries.create({
        ...input,
        auth: context.auth
      });

      emitEntryEvent(context.auth.workspaceID, {
        action: "entry:create",
        memberID: context.auth.session?.memberID,
        data: newEntry
      });

      emitPublishingEntryUpdates({
        workspaceID: context.auth.workspaceID,
        entries: publishingEntries,
        memberID: context.auth.session?.memberID
      });

      return newEntry;
    }),
  bulkDelete: authenticatedRoute
    .route({ method: "POST", path: "/bulk/delete" })
    .input(
      z.object({
        ids: z.array(id()).describe("IDs of the entries to delete")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { entryIDs } = await Entries.delete({
        auth: context.auth,
        ids: input.ids
      });

      emitEntryEvent(context.auth.workspaceID, {
        action: "entry:delete",
        data: { ids: entryIDs },
        memberID: context.auth.session?.memberID
      });
    }),
  delete: authenticatedRoute
    .route({ method: "DELETE", path: "/:id" })
    .input(
      z.object({
        id: id().describe("ID of the entry to delete")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { entryIDs } = await Entries.delete({
        auth: context.auth,
        ids: [input.id]
      });

      if (entryIDs.length === 0) {
        throw new ORPCError("NOT_FOUND");
      }

      emitEntryEvent(context.auth.workspaceID, {
        action: "entry:delete",
        data: { ids: entryIDs }
      });
    }),
  update: authenticatedRoute
    .route({ method: "PUT", path: "/:id" })
    .input(
      z.object({
        id: id().describe("ID of the entry to be updated"),
        name: entryName().optional().describe("New name of the entry")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const name = input.name;

      await Entries.update({
        auth: context.auth,
        id: input.id,
        name
      });

      if (name !== undefined) {
        await updateDocumentTitle(
          input.id,
          name,
          context.auth.workspaceID,
          context.auth.session?.memberID
        );
      }

      emitEntryEvent(context.auth.workspaceID, {
        action: "entry:update",
        data: { id: input.id, name },
        memberID: context.auth.session?.memberID
      });
    }),
  move: sessionRoute
    .input(
      z.object({
        id: id().describe("ID of the entry to be moved"),
        order: lexoRank().describe("New LexoRank order of the entry"),
        collectionID: id().optional().nullable().describe("ID of the new parent collection")
      })
    )
    .output(z.object({ order: z.string() }))
    .handler(async ({ context, input }) => {
      const result = await Entries.move({
        auth: context.auth,
        id: input.id,
        order: input.order,
        collectionID: input.collectionID
      });
      emitEntryEvent(context.auth.workspaceID, {
        action: "entry:move",
        data: {
          id: input.id,
          order: result.order,
          collectionID: input.collectionID,
          restrictedBoundaryChanged: result.restrictedBoundaryChanged
        },
        memberID: context.auth.session?.memberID
      });

      if (result.publishingEntries.length > 0) {
        emitPublishingEntryUpdates({
          workspaceID: context.auth.workspaceID,
          entries: result.publishingEntries,
          memberID: context.auth.session?.memberID
        });
      }

      return { order: result.order };
    }),
  get: authenticatedRoute
    .route({ method: "GET", path: "/:id" })
    .input(
      z.object({
        id: id().describe("ID of the entry to get")
      })
    )
    .output(entryDetailsType)
    .handler(async ({ context, input }) => {
      return Entries.get({
        auth: context.auth,
        id: input.id
      });
    }),
  list: authenticatedRoute
    .route({ method: "GET", path: "/list" })
    .input(
      z.object({
        collectionID: id().optional().describe("ID of the collection to get entries from"),
        cursor: id().optional().describe("Cursor from the previous page"),
        limit: z.number().int().min(1).max(100).optional().describe("Maximum entries to return")
      })
    )
    .output(entryListType)
    .handler(async ({ context, input }) => {
      const { entries, nextCursor } = await Entries.list({
        auth: context.auth,
        collectionID: input.collectionID,
        cursor: input.cursor,
        limit: input.limit
      });

      return {
        data: entries,
        pagination: {
          nextCursor,
          hasMore: nextCursor !== null
        }
      };
    })
});

export { entriesRouter };
