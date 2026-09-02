import { versionDetailsType, versionSummaryType } from "#backend/lib/data";
import {
  emitPublishingEntryUpdates,
  emitPublishingEvent,
  emitVersionCreationEvents
} from "#backend/events";
import {
  PUBLISHED_CHANNEL_CODE,
  publishingChannelCodeType,
  publishingChannelNameType
} from "#backend/lib/publishing";
import { id } from "#backend/lib/primitives";
import { enqueuePublishedChannelPurge, enqueuePublishedEntrySync } from "#backend/lib/queue";
import { authenticatedRoute, base } from "#backend/lib/transport";
import { Publishing } from "#backend/services/publishing";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

interface PublishingEntryReference {
  entryID: string;
}

const publishingChannelType = z.object({
  code: publishingChannelCodeType.describe("Publishing channel API identifier"),
  name: publishingChannelNameType.describe("Publishing channel label"),
  builtIn: z.boolean().describe("Whether the channel is built in"),
  createdAt: z.iso.datetime().describe("Time when the channel was created"),
  updatedAt: z.iso.datetime().describe("Time when the channel was last updated")
});
const entryPublicationChannelType = publishingChannelType.pick({
  builtIn: true,
  code: true,
  name: true
});
const entryPublicationType = z.object({
  channel: entryPublicationChannelType,
  publishedAt: z.iso.datetime().describe("Time when the version was published"),
  version: versionSummaryType
});
const publishingChannelListItemType = publishingChannelType.extend({
  assignmentCount: z.number().int().min(0).optional()
});
const channelInput = z.object({
  channel: publishingChannelCodeType
    .optional()
    .default(PUBLISHED_CHANNEL_CODE)
    .describe("Publishing channel, defaults to published")
});
const publishEntryTargetType = z.object({
  entryID: id().describe("Entry to publish"),
  versionID: id().optional().describe("Existing version to publish")
});
const getContributorIDs = (auth: { session?: { memberID: string } }): string[] => {
  return auth.session ? [auth.session.memberID] : [];
};
const syncPublishedEntries = async (
  workspaceID: string,
  entries: PublishingEntryReference[]
): Promise<void> => {
  await enqueuePublishedEntrySync({
    workspaceID,
    entryIDs: entries.map(({ entryID }) => entryID)
  });
};
const publishingRouter = base.prefix("/publishing").router({
  setCollection: authenticatedRoute
    .route({ method: "PUT", path: "/collections/:collectionID" })
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
      const [result] = await Publishing.Collections.set({
        auth: context.auth,
        collectionIDs: [input.collectionID],
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
        emitPublishingEntryUpdates({
          workspaceID: context.auth.workspaceID,
          entries: result.publishingEntries,
          memberID: context.auth.session?.memberID
        });
      }

      emitVersionCreationEvents(
        context.auth.workspaceID,
        result.createdVersions,
        context.auth.session?.memberID
      );
      await syncPublishedEntries(context.auth.workspaceID, result.publishingEntries);

      return { publishedEntries: result.publishedEntries };
    }),
  bulkSetCollections: authenticatedRoute
    .route({ method: "POST", path: "/collections/bulk/set" })
    .input(
      z.object({
        ids: z.array(id()).min(1).describe("IDs of the collections to configure"),
        enabled: z.boolean().describe("Whether to enable publishing on the collection trees"),
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
      const results = await Publishing.Collections.set({
        auth: context.auth,
        collectionIDs: input.ids,
        enabled: input.enabled,
        publish: input.publish,
        contributorIDs: getContributorIDs(context.auth)
      });
      const publishedEntries = results.reduce((total, result) => {
        return total + result.publishedEntries;
      }, 0);

      for (const result of results) {
        if (result.changed) {
          emitPublishingEvent(context.auth.workspaceID, {
            action: "publishing:collection-update",
            data: { id: result.collectionID, enabled: input.enabled },
            memberID: context.auth.session?.memberID
          });
          emitPublishingEntryUpdates({
            workspaceID: context.auth.workspaceID,
            entries: result.publishingEntries,
            memberID: context.auth.session?.memberID
          });
        }

        emitVersionCreationEvents(
          context.auth.workspaceID,
          result.createdVersions,
          context.auth.session?.memberID
        );
      }
      await syncPublishedEntries(
        context.auth.workspaceID,
        results.flatMap(({ publishingEntries }) => publishingEntries)
      );

      return { publishedEntries };
    }),
  publishCollection: authenticatedRoute
    .route({ method: "POST", path: "/collections/:collectionID" })
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
        auth: context.auth,
        collectionIDs: [input.collectionID],
        channel: input.channel,
        contributorIDs: getContributorIDs(context.auth)
      });

      emitPublishingEntryUpdates({
        workspaceID: context.auth.workspaceID,
        entries: result.publishingEntries,
        channel: input.channel,
        memberID: context.auth.session?.memberID
      });

      emitVersionCreationEvents(
        context.auth.workspaceID,
        result.createdVersions,
        context.auth.session?.memberID
      );
      await syncPublishedEntries(context.auth.workspaceID, result.publishingEntries);

      return { publishedEntries: result.publishedEntries };
    }),
  bulkPublishCollections: authenticatedRoute
    .route({ method: "POST", path: "/collections/bulk/publish" })
    .input(
      channelInput.extend({
        ids: z.array(id()).min(1).describe("IDs of the collection trees to publish")
      })
    )
    .output(
      z.object({
        publishedEntries: z.number().int().min(0).describe("Number of entries published")
      })
    )
    .handler(async ({ context, input }) => {
      const result = await Publishing.Collections.publish({
        auth: context.auth,
        collectionIDs: input.ids,
        channel: input.channel,
        contributorIDs: getContributorIDs(context.auth)
      });

      emitPublishingEntryUpdates({
        workspaceID: context.auth.workspaceID,
        entries: result.publishingEntries,
        channel: input.channel,
        memberID: context.auth.session?.memberID
      });

      emitVersionCreationEvents(
        context.auth.workspaceID,
        result.createdVersions,
        context.auth.session?.memberID
      );
      await syncPublishedEntries(context.auth.workspaceID, result.publishingEntries);

      return { publishedEntries: result.publishedEntries };
    }),
  unpublishCollection: authenticatedRoute
    .route({ method: "DELETE", path: "/collections/:collectionID" })
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
        auth: context.auth,
        collectionIDs: [input.collectionID],
        channel: input.channel
      });

      emitPublishingEntryUpdates({
        workspaceID: context.auth.workspaceID,
        entries: result.publishingEntries,
        channel: input.channel,
        memberID: context.auth.session?.memberID
      });
      await syncPublishedEntries(context.auth.workspaceID, result.publishingEntries);

      return { unpublishedEntries: result.unpublishedEntries };
    }),
  bulkUnpublishCollections: authenticatedRoute
    .route({ method: "POST", path: "/collections/bulk/unpublish" })
    .input(
      channelInput.extend({
        ids: z.array(id()).min(1).describe("IDs of the collection trees to unpublish")
      })
    )
    .output(
      z.object({
        unpublishedEntries: z.number().int().min(0).describe("Number of entries unpublished")
      })
    )
    .handler(async ({ context, input }) => {
      const result = await Publishing.Collections.unpublish({
        auth: context.auth,
        collectionIDs: input.ids,
        channel: input.channel
      });

      emitPublishingEntryUpdates({
        workspaceID: context.auth.workspaceID,
        entries: result.publishingEntries,
        channel: input.channel,
        memberID: context.auth.session?.memberID
      });
      await syncPublishedEntries(context.auth.workspaceID, result.publishingEntries);

      return { unpublishedEntries: result.unpublishedEntries };
    }),
  publishEntry: authenticatedRoute
    .route({ method: "POST", path: "/entries/:entryID" })
    .input(
      channelInput.extend({
        entryID: id().describe("Entry to publish"),
        versionID: id().optional().describe("Existing version to publish")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const result = await Publishing.Entries.publish({
        auth: context.auth,
        entries: [{ entryID: input.entryID, versionID: input.versionID }],
        channel: input.channel,
        contributorIDs: getContributorIDs(context.auth)
      });

      emitPublishingEntryUpdates({
        workspaceID: context.auth.workspaceID,
        entries: result.publishingEntries,
        channel: input.channel,
        memberID: context.auth.session?.memberID
      });

      emitVersionCreationEvents(
        context.auth.workspaceID,
        result.createdVersions,
        context.auth.session?.memberID
      );
      await syncPublishedEntries(context.auth.workspaceID, result.publishingEntries);
    }),
  bulkPublishEntries: authenticatedRoute
    .route({ method: "POST", path: "/entries/bulk/publish" })
    .input(
      channelInput.extend({
        entries: z.array(publishEntryTargetType).min(1).describe("Entries and versions to publish")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const result = await Publishing.Entries.publish({
        auth: context.auth,
        entries: input.entries,
        channel: input.channel,
        contributorIDs: getContributorIDs(context.auth)
      });

      emitPublishingEntryUpdates({
        workspaceID: context.auth.workspaceID,
        entries: result.publishingEntries,
        channel: input.channel,
        memberID: context.auth.session?.memberID
      });

      emitVersionCreationEvents(
        context.auth.workspaceID,
        result.createdVersions,
        context.auth.session?.memberID
      );
      await syncPublishedEntries(context.auth.workspaceID, result.publishingEntries);
    }),
  unpublishEntry: authenticatedRoute
    .route({ method: "DELETE", path: "/entries/:entryID" })
    .input(
      channelInput.extend({
        entryID: id().describe("Entry to unpublish"),
        versionID: id().optional().describe("Version expected to be assigned")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const result = await Publishing.Entries.unpublish({
        auth: context.auth,
        entryIDs: [input.entryID],
        versionID: input.versionID,
        channel: input.channel
      });

      if (input.versionID && !result.removed) {
        throw new ORPCError("CONFLICT", { message: "Publishing assignment changed" });
      }

      emitPublishingEntryUpdates({
        workspaceID: context.auth.workspaceID,
        entries: result.publishingEntries,
        channel: input.channel,
        memberID: context.auth.session?.memberID
      });
      await syncPublishedEntries(context.auth.workspaceID, result.publishingEntries);
    }),
  bulkUnpublishEntries: authenticatedRoute
    .route({ method: "POST", path: "/entries/bulk/unpublish" })
    .input(
      channelInput.extend({
        ids: z.array(id()).min(1).describe("IDs of the entries to unpublish")
      })
    )
    .output(z.void())
    .handler(async ({ context, input }) => {
      const result = await Publishing.Entries.unpublish({
        auth: context.auth,
        entryIDs: input.ids,
        channel: input.channel
      });

      emitPublishingEntryUpdates({
        workspaceID: context.auth.workspaceID,
        entries: result.publishingEntries,
        channel: input.channel,
        memberID: context.auth.session?.memberID
      });
      await syncPublishedEntries(context.auth.workspaceID, result.publishingEntries);
    }),
  getEntryVersion: authenticatedRoute
    .route({ method: "GET", path: "/entries/:entryID/version" })
    .input(
      channelInput.extend({
        entryID: id().describe("Entry whose published version to get")
      })
    )
    .output(versionDetailsType)
    .handler(({ context, input }) => {
      return Publishing.Entries.getVersion({
        auth: context.auth,
        entryID: input.entryID,
        channel: input.channel
      });
    }),
  listEntryPublications: authenticatedRoute
    .route({ method: "GET", path: "/entries/:entryID/publications" })
    .input(z.object({ entryID: id().describe("Entry whose publications to list") }))
    .output(z.array(entryPublicationType))
    .handler(({ context, input }) => {
      return Publishing.Entries.listPublications({
        auth: context.auth,
        entryID: input.entryID
      });
    }),
  listChannels: authenticatedRoute
    .route({ method: "GET", path: "/channels" })
    .input(
      z.object({
        includeAssignmentCount: z
          .boolean()
          .optional()
          .describe("Whether to include the number of assigned entries")
      })
    )
    .output(z.array(publishingChannelListItemType))
    .handler(({ context, input }) => {
      return Publishing.Channels.list({
        auth: context.auth,
        includeAssignmentCount: input.includeAssignmentCount
      });
    }),
  createChannel: authenticatedRoute
    .route({ method: "POST", path: "/channels" })
    .input(z.object({ name: publishingChannelNameType.describe("Publishing channel label") }))
    .output(publishingChannelType)
    .handler(async ({ context, input }) => {
      const channel = await Publishing.Channels.create({
        auth: context.auth,
        name: input.name
      });

      emitPublishingEvent(context.auth.workspaceID, {
        action: "publishing:channel-create",
        data: channel,
        memberID: context.auth.session?.memberID
      });

      return channel;
    }),
  deleteChannel: authenticatedRoute
    .route({ method: "DELETE", path: "/channels/:code" })
    .input(z.object({ code: publishingChannelCodeType.describe("Publishing channel identifier") }))
    .output(z.void())
    .handler(async ({ context, input }) => {
      const { channelID } = await Publishing.Channels.delete({
        auth: context.auth,
        code: input.code
      });
      await enqueuePublishedChannelPurge({
        workspaceID: context.auth.workspaceID,
        channelID
      });

      emitPublishingEvent(context.auth.workspaceID, {
        action: "publishing:channel-delete",
        data: { code: input.code },
        memberID: context.auth.session?.memberID
      });
    })
});

export { publishingRouter };
