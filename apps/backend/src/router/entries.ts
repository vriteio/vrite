import { entryType } from "#backend/db";
import { emitEntryEvent } from "#backend/events";
import { objectID } from "#backend/lib/mongo";
import { sessionPlugin } from "#backend/plugins";
import { Entries } from "#backend/services/entries";
import Elysia, { t } from "elysia";

const entriesRouterPlugin = new Elysia({
  prefix: "/entries"
})
  .use(sessionPlugin)
  .post(
    "/",
    async ({ body, session }) => {
      const newEntry = await Entries.create({
        ...body,
        workspaceID: session.workspaceID
      });

      emitEntryEvent(session.workspaceID, {
        action: "entry:create",
        userID: session.userID,
        data: newEntry
      });

      return newEntry;
    },
    {
      authorize: true,
      body: t.Partial(t.Omit(entryType, ["id", "order"])),
      response: entryType
    }
  )
  .delete(
    "/",
    async ({ session, query }) => {
      await Entries.delete({
        workspaceID: session.workspaceID,
        ids: query.ids
      });

      emitEntryEvent(session.workspaceID, {
        action: "entry:delete",
        data: { ids: query.ids },
        userID: session.userID
      });
    },
    {
      authorize: true,
      query: t.Object({
        ids: t.Array(
          objectID({
            description: "Comma-separated IDs of the entries to be deleted"
          })
        )
      }),
      response: t.Void()
    }
  )
  .put(
    "/:id",
    async ({ session, params, body }) => {
      await Entries.update({
        id: params.id,
        workspaceID: session.workspaceID,
        ...body
      });

      emitEntryEvent(session.workspaceID, {
        action: "entry:update",
        data: { id: params.id, ...body },
        userID: session.userID
      });
    },
    {
      authorize: true,
      params: t.Object({
        id: objectID({ description: "ID of the entry to be updated" })
      }),
      body: t.Partial(t.Pick(entryType, ["name"])),
      response: t.Void()
    }
  )
  .put(
    "/move/:id",
    async ({ session, params, body }) => {
      await Entries.move({
        id: params.id,
        workspaceID: session.workspaceID,
        ...body
      });

      emitEntryEvent(session.workspaceID, {
        action: "entry:move",
        data: { id: params.id, ...body },
        userID: session.userID
      });
    },
    {
      authorize: true,
      params: t.Object({
        id: objectID({
          description: "ID of the entry to be moved"
        })
      }),
      body: t.Partial(
        t.Object({
          followingEntryID: objectID({
            description: "ID of the sibling entry, behind which the entry will be moved"
          }),
          precedingEntryID: objectID({
            description: "ID of the sibling entry, in front of which the entry will be moved"
          })
        })
      ),
      response: t.Void()
    }
  )
  .get(
    "/list",
    async ({ query, session }) => {
      return Entries.list({
        workspaceID: session.workspaceID,
        lastOrder: query?.lastOrder,
        perPage: query?.perPage,
        page: query?.page
      });
    },
    {
      authorize: true,
      response: t.Array(entryType),
      query: t.Optional(
        t.Object({
          lastOrder: t.Optional(
            t.String({
              description: "Last order to get entries from"
            })
          ),
          perPage: t.Optional(
            t.Number({
              description: "Number of entries to get per page"
            })
          ),
          page: t.Optional(
            t.Number({
              description: "Page number"
            })
          )
        })
      )
    }
  );

export { entriesRouterPlugin };
