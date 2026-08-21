import { entryType, lexoRank } from "#backend/db";
import { updateDocumentTitle } from "#backend/collaboration";
import { emitEntryEvent, emitVersionCreationEvents } from "#backend/events";
import { authorized, base } from "#backend/lib/transport";
import { contentNodeType } from "#backend/lib/content";
import { id } from "#backend/lib/primitives";
import { entryName } from "#backend/lib/validation";
import { canManagePublishing, emitPublishingStatusUpdates } from "#backend/lib/publishing";
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

      await emitPublishingStatusUpdates({
        workspaceID: context.auth.workspaceID,
        entryIDs: [newEntry.id],
        memberID: context.auth.session?.memberID
      });

      return newEntry;
    }),
  bulkDelete: base
    .route({ method: "POST", path: "/bulk/delete" })
    .meta({
      required: {
        session: ["content"],
        key: ["entries"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        ids: z.array(id()).describe("IDs of the entries to delete")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { entryIDs } = await Entries.delete({
        workspaceID: context.auth.workspaceID,
        ids: input.ids
      });

      emitEntryEvent(context.auth.workspaceID, {
        action: "entry:delete",
        data: { ids: entryIDs },
        memberID: context.auth.session?.memberID
      });
    }),
  delete: base
    .route({ method: "DELETE", path: "/:id" })
    .meta({
      required: {
        key: ["entries"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        id: id().describe("ID of the entry to delete")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { entryIDs } = await Entries.delete({
        workspaceID: context.auth.workspaceID,
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
        name: entryName().optional().describe("New name of the entry")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const name = input.name;

      await Entries.update({
        id: input.id,
        workspaceID: context.auth.workspaceID,
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
  move: base
    .meta({
      required: {
        session: ["content"]
      }
    })
    .input(
      z.object({
        id: id().describe("ID of the entry to be moved"),
        order: lexoRank().describe("New LexoRank order of the entry"),
        collectionID: id().optional().nullable().describe("ID of the new parent collection"),
        publish: z
          .boolean()
          .optional()
          .describe("Whether to publish the latest version when entering an enabled tree")
      })
    )
    .use(authorized)
    .output(z.object({ order: z.string() }))
    .handler(async ({ context, input }) => {
      const result = await Entries.move({
        id: input.id,
        workspaceID: context.auth.workspaceID,
        order: input.order,
        collectionID: input.collectionID,
        publish: input.publish,
        canPublish: canManagePublishing(context.auth),
        contributorIDs: context.auth.session ? [context.auth.session.memberID] : []
      });
      emitEntryEvent(context.auth.workspaceID, {
        action: "entry:move",
        data: {
          id: input.id,
          order: result.order,
          collectionID: input.collectionID
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

      return { order: result.order };
    }),
  get: base
    .route({ method: "GET", path: "/:id" })
    .meta({
      required: {
        key: ["read:entries"],
        session: true
      }
    })
    .use(authorized)
    .input(
      z.object({
        id: id().describe("ID of the entry to get")
      })
    )
    .output(entryDetailsType)
    .handler(async ({ context, input }) => {
      return Entries.get({
        id: input.id,
        workspaceID: context.auth.workspaceID
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
        collectionID: id().optional().describe("ID of the collection to get entries from"),
        cursor: id().optional().describe("Cursor from the previous page"),
        limit: z.number().int().min(1).max(100).optional().describe("Maximum entries to return")
      })
    )
    .output(entryListType)
    .handler(async ({ context, input }) => {
      const { entries, nextCursor } = await Entries.list({
        workspaceID: context.auth.workspaceID,
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
