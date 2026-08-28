import { collectionType, entryType } from "#backend/db";
import { collectionAccessType } from "#backend/lib/policy";
import { id } from "#backend/lib/primitives";
import { PUBLISHED_CHANNEL_CODE, publishingChannelCodeType } from "#backend/lib/publishing";
import { authenticatedRoute, base, sessionRoute } from "#backend/lib/transport";
import { Memberships } from "#backend/services/memberships";
import { Sync } from "#backend/services/sync";
import * as z from "zod";

const explorerTreeType = z.object({
  collections: z.array(collectionType),
  entries: z.array(entryType),
  accessByCollectionID: z.record(id(), collectionAccessType),
  publishing: z
    .object({
      enabledCollectionIDs: z.array(id()),
      unpublishedEntryIDs: z.array(id())
    })
    .nullable(),
  rootID: id()
});

const syncRouter = base.router({
  setCurrentEntry: sessionRoute
    .input(
      z.object({
        entryID: id().describe("ID of the entry that the member opened")
      })
    )
    .output(z.void())
    .handler(({ context, input }) => {
      return Memberships.setCurrentEntry({
        auth: context.auth,
        entryID: input.entryID
      });
    }),
  getExplorerTree: sessionRoute.output(explorerTreeType).handler(async ({ context }) => {
    return Sync.getExplorerTree({
      auth: context.auth,
      includePublishing: true
    });
  }),
  getPublishingStatus: sessionRoute
    .input(
      z.object({
        channel: publishingChannelCodeType.optional().default(PUBLISHED_CHANNEL_CODE)
      })
    )
    .output(
      z.object({
        channel: publishingChannelCodeType,
        unpublishedEntryIDs: z.array(id())
      })
    )
    .handler(async ({ context, input }) => {
      return Sync.getPublishingStatus({
        auth: context.auth,
        channel: input.channel
      });
    }),
  workspaceUpdates: authenticatedRoute.handler(async function* ({ context, signal }) {
    const { events } = await Sync.listenToWorkspaceEvents({
      auth: context.auth,
      signal
    });

    yield* events;
  })
});

export { syncRouter };
