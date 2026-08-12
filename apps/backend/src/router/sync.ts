import { collectionType, entryType } from "#backend/db";
import { id } from "#backend/lib/primitives";
import { authorized, base } from "#backend/lib/transport";
import { Memberships } from "#backend/services/memberships";
import { Sync } from "#backend/services/sync";
import * as z from "zod";

const explorerTreeType = z.object({
  collections: z.array(collectionType),
  entries: z.array(entryType)
});

const syncRouter = base.router({
  setCurrentEntry: base
    .meta({
      required: {
        session: true
      }
    })
    .use(authorized)
    .input(
      z.object({
        entryID: id().describe("ID of the entry that the member opened")
      })
    )
    .output(z.void())
    .handler(({ context, input }) => {
      return Memberships.setCurrentEntry({
        entryID: input.entryID,
        memberID: context.auth.session!.memberID,
        workspaceID: context.auth.workspaceID
      });
    }),
  getExplorerTree: base
    .meta({
      required: {
        session: true
      }
    })
    .use(authorized)
    .output(explorerTreeType)
    .handler(async ({ context }) => {
      return Sync.getExplorerTree({
        workspaceID: context.auth.workspaceID
      });
    }),
  workspaceUpdates: base.use(authorized).handler(async function* ({ context, signal }) {
    const { events } = Sync.listenToWorkspaceEvents({
      auth: context.auth,
      workspaceID: context.auth.workspaceID,
      signal
    });

    yield* events;
  })
});

export { syncRouter };
