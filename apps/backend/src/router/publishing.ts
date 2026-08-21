import { versionDetailsType } from "#backend/lib/data";
import { emitPublishingEvent, emitVersionCreationEvents } from "#backend/events";
import {
  emitPublishingStatusUpdates,
  PUBLISHED_CHANNEL_NAME,
  publishingChannelNameType
} from "#backend/lib/publishing";
import { id } from "#backend/lib/primitives";
import { authorized, base } from "#backend/lib/transport";
import { Publishing } from "#backend/services/publishing";
import * as z from "zod";

const publishingChannelType = z.object({
  name: publishingChannelNameType.describe("Publishing channel identifier"),
  builtIn: z.boolean().describe("Whether the channel is built in"),
  createdAt: z.iso.datetime().describe("Time when the channel was created"),
  updatedAt: z.iso.datetime().describe("Time when the channel was last updated")
});
const channelInput = z.object({
  channel: publishingChannelNameType
    .optional()
    .default(PUBLISHED_CHANNEL_NAME)
    .describe("Publishing channel, defaults to published")
});
const getContributorIDs = (auth: { session?: { memberID: string } }): string[] => {
  return auth.session ? [auth.session.memberID] : [];
};
const publishingRouter = base.prefix("/publishing").router({
  setCollection: base
    .route({ method: "PUT", path: "/collections/:collectionID" })
    .meta({
      required: {
        session: ["publishing"],
        key: ["publishing"]
      }
    })
    .use(authorized)
    .input(
      z.object({
        collectionID: id().describe("Collection to configure"),
        enabled: z.boolean().describe("Whether to enable publishing on the collection tree"),
        publish: z
          .boolean()
          .optional()
          .describe("Whether to publish latest entry versions when enabling publishing")
      })
    )
    .output(
      z.object({
        publishedEntries: z.number().int().min(0).describe("Number of entries published")
      })
    )
    .handler(async ({ context, input }) => {
      const result = await Publishing.Collections.set({
        workspaceID: context.auth.workspaceID,
        collectionID: input.collectionID,
        enabled: input.enabled,
        publish: input.publish,
        contributorIDs: getContributorIDs(context.auth)
      });

      if (result.changed) {
        emitPublishingEvent(context.auth.workspaceID, {
          action: "publishing:collection-update",
          data: { id: input.collectionID, enabled: input.enabled },
          memberID: context.auth.session?.memberID
        });
        await emitPublishingStatusUpdates({
          workspaceID: context.auth.workspaceID,
          entryIDs: result.affectedEntryIDs,
          memberID: context.auth.session?.memberID
        });
      }

      emitVersionCreationEvents(
        context.auth.workspaceID,
        result.createdVersions,
        context.auth.session?.memberID
      );

      return { publishedEntries: result.publishedEntries };
    }),
  publishCollection: base
    .route({ method: "POST", path: "/collections/:collectionID" })
    .meta({
      required: {
        session: ["publishing"],
        key: ["publishing"]
      }
    })
    .use(authorized)
    .input(
      channelInput.extend({
        collectionID: id().describe("Collection tree to publish")
      })
    )
    .output(
      z.object({
        publishedEntries: z.number().int().min(0).describe("Number of entries published")
      })
    )
    .handler(async ({ context, input }) => {
      const result = await Publishing.Collections.publish({
        workspaceID: context.auth.workspaceID,
        collectionID: input.collectionID,
        channel: input.channel,
        contributorIDs: getContributorIDs(context.auth)
      });

      await emitPublishingStatusUpdates({
        workspaceID: context.auth.workspaceID,
        entryIDs: result.entryIDs,
        channel: input.channel,
        memberID: context.auth.session?.memberID
      });

      emitVersionCreationEvents(
        context.auth.workspaceID,
        result.createdVersions,
        context.auth.session?.memberID
      );

      return { publishedEntries: result.publishedEntries };
    }),
  unpublishCollection: base
    .route({ method: "DELETE", path: "/collections/:collectionID" })
    .meta({
      required: {
        session: ["publishing"],
        key: ["publishing"]
      }
    })
    .use(authorized)
    .input(
      channelInput.extend({
        collectionID: id().describe("Collection tree to unpublish")
      })
    )
    .output(
      z.object({
        unpublishedEntries: z.number().int().min(0).describe("Number of entries unpublished")
      })
    )
    .handler(async ({ context, input }) => {
      const result = await Publishing.Collections.unpublish({
        workspaceID: context.auth.workspaceID,
        collectionID: input.collectionID,
        channel: input.channel
      });

      await emitPublishingStatusUpdates({
        workspaceID: context.auth.workspaceID,
        entryIDs: result.entryIDs,
        channel: input.channel,
        memberID: context.auth.session?.memberID
      });

      return { unpublishedEntries: result.unpublishedEntries };
    }),
  publishEntry: base
    .route({ method: "POST", path: "/entries/:entryID" })
    .meta({
      required: {
        session: ["publishing"],
        key: ["publishing"]
      }
    })
    .use(authorized)
    .input(
      channelInput.extend({
        entryID: id().describe("Entry to publish")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const result = await Publishing.Entries.publish({
        workspaceID: context.auth.workspaceID,
        entryID: input.entryID,
        channel: input.channel,
        contributorIDs: getContributorIDs(context.auth)
      });

      await emitPublishingStatusUpdates({
        workspaceID: context.auth.workspaceID,
        entryIDs: [input.entryID],
        channel: input.channel,
        memberID: context.auth.session?.memberID
      });

      emitVersionCreationEvents(
        context.auth.workspaceID,
        result.createdVersions,
        context.auth.session?.memberID
      );
    }),
  unpublishEntry: base
    .route({ method: "DELETE", path: "/entries/:entryID" })
    .meta({
      required: {
        session: ["publishing"],
        key: ["publishing"]
      }
    })
    .use(authorized)
    .input(
      channelInput.extend({
        entryID: id().describe("Entry to unpublish")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Publishing.Entries.unpublish({
        workspaceID: context.auth.workspaceID,
        entryID: input.entryID,
        channel: input.channel
      });

      await emitPublishingStatusUpdates({
        workspaceID: context.auth.workspaceID,
        entryIDs: [input.entryID],
        channel: input.channel,
        memberID: context.auth.session?.memberID
      });
    }),
  getEntryVersion: base
    .route({ method: "GET", path: "/entries/:entryID/version" })
    .meta({
      required: {
        session: ["read:publishing"],
        key: ["read:publishing"]
      }
    })
    .use(authorized)
    .input(
      channelInput.extend({
        entryID: id().describe("Entry whose published version to get")
      })
    )
    .output(versionDetailsType)
    .handler(({ context, input }) => {
      return Publishing.Entries.getVersion({
        workspaceID: context.auth.workspaceID,
        entryID: input.entryID,
        channel: input.channel
      });
    }),
  listChannels: base
    .route({ method: "GET", path: "/channels" })
    .meta({
      required: {
        session: ["read:publishing"],
        key: ["read:publishing"]
      }
    })
    .use(authorized)
    .output(z.array(publishingChannelType))
    .handler(({ context }) => {
      return Publishing.Channels.list({ workspaceID: context.auth.workspaceID });
    }),
  createChannel: base
    .route({ method: "POST", path: "/channels" })
    .meta({
      required: {
        session: ["publishing"],
        key: ["publishing"]
      }
    })
    .use(authorized)
    .input(z.object({ name: publishingChannelNameType.describe("Publishing channel identifier") }))
    .output(publishingChannelType)
    .handler(async ({ context, input }) => {
      const channel = await Publishing.Channels.create({
        workspaceID: context.auth.workspaceID,
        name: input.name
      });

      emitPublishingEvent(context.auth.workspaceID, {
        action: "publishing:channel-create",
        data: channel,
        memberID: context.auth.session?.memberID
      });

      return channel;
    }),
  deleteChannel: base
    .route({ method: "DELETE", path: "/channels/:name" })
    .meta({
      required: {
        session: ["publishing"],
        key: ["publishing"]
      }
    })
    .use(authorized)
    .input(z.object({ name: publishingChannelNameType.describe("Publishing channel identifier") }))
    .output(z.void())
    .handler(async ({ context, input }) => {
      await Publishing.Channels.delete({
        workspaceID: context.auth.workspaceID,
        name: input.name
      });

      emitPublishingEvent(context.auth.workspaceID, {
        action: "publishing:channel-delete",
        data: { name: input.name },
        memberID: context.auth.session?.memberID
      });
    })
});

export { publishingRouter };
