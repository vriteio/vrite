import { Static, t } from "elysia";
import { SubscribeToEvent, subscribeToEvent } from "#backend/lib/events";
import { EntryEvent, entryEventType, emitEntryEvent, subscribeToEntryEvents } from "./entries";

declare module "#backend/lib/events" {
  interface Events {
    [workspaceEvent: string]: WorkspaceEvent;
  }
}

const workspaceEventType = t.Union([entryEventType]);

type WorkspaceEvent = Static<typeof workspaceEventType>;

const subscribeToWorkspaceEvents: SubscribeToEvent<{
  [workspaceID: string]: WorkspaceEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:*`, callback, options);
};

export {
  entryEventType,
  workspaceEventType,
  emitEntryEvent,
  subscribeToEntryEvents,
  subscribeToWorkspaceEvents
};
export type { WorkspaceEvent, EntryEvent };
