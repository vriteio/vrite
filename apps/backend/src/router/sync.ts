import { collectionType, entryType } from "#backend/db";
import { id } from "#backend/lib/primitives";
import {
  canReadPublishing,
  PUBLISHED_CHANNEL_CODE,
  publishingChannelCodeType
} from "#backend/lib/publishing";
import { authorized, base } from "#backend/lib/transport";
import { Memberships } from "#backend/services/memberships";
import { Sync } from "#backend/services/sync";
import * as z from "zod";

const explorerTreeType = z.object({
  collections: z.array(collectionType),
  entries: z.array(entryType),
  publishing: z
    .object({
      enabledCollectionIDs: z.array(id()),
      unpublishedEntryIDs: z.array(id())
    })
    .nullable()
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
        auth: context.auth,
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
        auth: context.auth,
        workspaceID: context.auth.workspaceID,
        includePublishing: canReadPublishing(context.auth)
      });
    }),
  getPublishingStatus: base
    .meta({
      required: {
        session: ["read:publishing"]
      }
    })
    .use(authorized)
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
        workspaceID: context.auth.workspaceID,
        channel: input.channel
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
