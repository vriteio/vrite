import { collectionType, entryType } from "#backend/db";
import { authorized, base } from "#backend/lib/transport";
import { Sync } from "#backend/services/sync";
import * as z from "zod";

const explorerTreeType = z.object({
  collections: z.array(collectionType),
  entries: z.array(entryType)
});

const syncRouter = base.router({
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
