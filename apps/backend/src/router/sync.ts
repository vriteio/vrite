import { subscribeToWorkspaceEvents, workspaceEventType } from "#backend/events";
import { collectionType, entryType } from "#backend/db";
import { viaIterator } from "#backend/lib/events";
import { authorized } from "#backend/lib/middleware";
import { base } from "#backend/lib/orpc";
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
        session: ["content"]
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
    const eventIterator = viaIterator(subscribeToWorkspaceEvents, context.auth.workspaceID, {
      signal
    });
    for await (const eventPayload of eventIterator) {
      const parsedEvent = workspaceEventType.safeParse(eventPayload);

      if (!parsedEvent.success) {
        continue;
      }

      if (!Sync.isWorkspaceEventVisible(context.auth, parsedEvent.data)) {
        continue;
      }

      yield parsedEvent.data;
    }
  })
});

export { syncRouter };
