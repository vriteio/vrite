import { type VersionSummary, versionSummaryType } from "#backend/lib/data/entry-version";
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
    [versionEvent: `${string}:versions`]: VersionEvent;
  }
}

interface VersionDeletion {
  entryID: string;
  id: string;
}

const versionEventType = z.union([
  z.object({
    action: z.literal("version:create"),
    memberID: id().optional(),
    data: versionSummaryType
  }),
  z.object({
    action: z.literal("version:update"),
    memberID: id().optional(),
    data: versionSummaryType
  }),
  z.object({
    action: z.literal("version:delete"),
    memberID: id().optional(),
    data: z.object({
      entryIDsByVersionID: z.record(id(), id()),
      ids: z.array(id())
    })
  })
]);

type VersionEvent = z.infer<typeof versionEventType>;

const VERSION_EVENT_BATCH_SIZE = 100;
const emitVersionEvent: EmitEvent<{
  [workspaceID: string]: VersionEvent;
}> = (workspaceID, event) => {
  emitEvent(`${workspaceID}:versions`, event);
};
const emitVersionDeletionEvents = (
  workspaceID: string,
  versions: VersionDeletion[],
  memberID?: string
): void => {
  for (let index = 0; index < versions.length; index += VERSION_EVENT_BATCH_SIZE) {
    const batch = versions.slice(index, index + VERSION_EVENT_BATCH_SIZE);

    emitVersionEvent(workspaceID, {
      action: "version:delete",
      data: {
        entryIDsByVersionID: Object.fromEntries(
          batch.map((version) => [version.id, version.entryID])
        ),
        ids: batch.map((version) => version.id)
      },
      memberID
    });
  }
};
const emitVersionCreationEvents = (
  workspaceID: string,
  versions: VersionSummary[],
  memberID?: string
): void => {
  for (const version of versions) {
    emitVersionEvent(workspaceID, {
      action: "version:create",
      data: version,
      memberID
    });
  }
};
const subscribeToVersionEvents: SubscribeToEvent<{
  [workspaceID: string]: VersionEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:versions`, callback, {
    ...options,
    schema: versionEventType
  });
};

export {
  emitVersionCreationEvents,
  emitVersionDeletionEvents,
  emitVersionEvent,
  subscribeToVersionEvents,
  versionEventType
};
export type { VersionDeletion, VersionEvent };
