import { SubscribeToEvent, subscribeToEvent } from "#backend/lib/events";
import { entryEventType } from "./entries";
import { keyEventType } from "./keys";
import { membershipEventType } from "./memberships";
import { collectionEventType } from "./collections";
import { roleEventType } from "./roles";
import { workspaceStateEventType } from "./workspaces";
import * as z from "zod";

declare module "#backend/lib/events" {
  interface Events {
    [workspaceEvent: string]: WorkspaceEvent;
  }
}

const workspaceEventType = z.union([
  entryEventType,
  collectionEventType,
  membershipEventType,
  roleEventType,
  keyEventType,
  workspaceStateEventType
]);
const workspaceSettingsEventType = z.union([
  membershipEventType,
  roleEventType,
  keyEventType,
  workspaceStateEventType
]);

type WorkspaceEvent = z.infer<typeof workspaceEventType>;
type WorkspaceSettingsEvent = z.infer<typeof workspaceSettingsEventType>;

const subscribeToWorkspaceEvents: SubscribeToEvent<{
  [workspaceID: string]: WorkspaceEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:*`, callback, options);
};

export { workspaceEventType, workspaceSettingsEventType, subscribeToWorkspaceEvents };
export type { WorkspaceEvent, WorkspaceSettingsEvent };
export * from "./entries";
export * from "./collections";
export * from "./memberships";
export * from "./roles";
export * from "./keys";
export * from "./workspaces";
