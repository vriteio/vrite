import {
  publishingChannelCodeType,
  publishingChannelNameType
} from "#backend/lib/publishing/channel";
import {
  emitEvent,
  type EmitEvent,
  subscribeToEvent,
  type SubscribeToEvent
} from "#backend/lib/messaging";
import { id } from "#backend/lib/primitives";
import * as z from "zod";

declare module "#backend/lib/messaging/events" {
  interface Events {
    [publishingEvent: `${string}:publishing`]: PublishingEvent;
  }
}

const publishingEntryStatusType = z.object({
  entryID: id(),
  hasUnpublishedChanges: z.boolean(),
  versionID: id().nullable()
});
const publishingEntryContentUpdateType = z.object({
  entryID: id(),
  matchesPublishedVersion: z.boolean()
});
const publishingEventType = z.union([
  z.object({
    action: z.literal("publishing:collection-update"),
    memberID: id().optional(),
    data: z.object({
      id: id(),
      enabled: z.boolean()
    })
  }),
  z.object({
    action: z.literal("publishing:entries-update"),
    memberID: id().optional(),
    data: z.object({
      channel: publishingChannelCodeType,
      entries: z.array(publishingEntryStatusType)
    })
  }),
  z.object({
    action: z.literal("publishing:entries-content-update"),
    data: z.object({ entries: z.array(publishingEntryContentUpdateType) })
  }),
  z.object({
    action: z.literal("publishing:channel-create"),
    memberID: id().optional(),
    data: z.object({
      code: publishingChannelCodeType,
      name: publishingChannelNameType,
      builtIn: z.boolean(),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime()
    })
  }),
  z.object({
    action: z.literal("publishing:channel-delete"),
    memberID: id().optional(),
    data: z.object({ code: publishingChannelCodeType })
  })
]);

type PublishingEvent = z.infer<typeof publishingEventType>;

const PUBLISHING_EVENT_BATCH_SIZE = 100;
const emitPublishingEvent: EmitEvent<{
  [workspaceID: string]: PublishingEvent;
}> = (workspaceID, event) => {
  emitEvent(`${workspaceID}:publishing`, event);
};
const emitPublishingEntryUpdates = (input: {
  workspaceID: string;
  entries: Array<z.infer<typeof publishingEntryStatusType>>;
  memberID?: string;
  channel?: string;
}): void => {
  const channel = input.channel || "published";

  for (let index = 0; index < input.entries.length; index += PUBLISHING_EVENT_BATCH_SIZE) {
    emitPublishingEvent(input.workspaceID, {
      action: "publishing:entries-update",
      memberID: input.memberID,
      data: {
        channel,
        entries: input.entries.slice(index, index + PUBLISHING_EVENT_BATCH_SIZE)
      }
    });
  }
};
const emitPublishingEntryContentUpdates = (input: {
  workspaceID: string;
  entries: Array<z.infer<typeof publishingEntryContentUpdateType>>;
}): void => {
  for (let index = 0; index < input.entries.length; index += PUBLISHING_EVENT_BATCH_SIZE) {
    emitPublishingEvent(input.workspaceID, {
      action: "publishing:entries-content-update",
      data: { entries: input.entries.slice(index, index + PUBLISHING_EVENT_BATCH_SIZE) }
    });
  }
};
const subscribeToPublishingEvents: SubscribeToEvent<{
  [workspaceID: string]: PublishingEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:publishing`, callback, {
    ...options,
    schema: publishingEventType
  });
};

export {
  emitPublishingEntryContentUpdates,
  emitPublishingEntryUpdates,
  emitPublishingEvent,
  publishingEventType,
  subscribeToPublishingEvents
};
export type { PublishingEvent };
