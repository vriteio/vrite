import { workspaceType } from "#backend/db";
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
    [workspaceStateEvent: `${string}:workspace`]: WorkspaceStateEvent;
  }
}

const workspaceSummaryEventType = workspaceType.pick({
  id: true,
  name: true,
  subscriptionPlan: true
});
const workspaceStateEventType = z.union([
  z.object({
    action: z.literal("workspace:create"),
    memberID: id().optional(),
    data: workspaceSummaryEventType
  }),
  z.object({
    action: z.literal("workspace:update"),
    memberID: id().optional(),
    data: z.object({
      ...workspaceSummaryEventType.pick({ id: true }).shape,
      ...workspaceSummaryEventType.omit({ id: true }).partial().shape
    })
  }),
  z.object({
    action: z.literal("workspace:delete"),
    memberID: id().optional(),
    data: z.object({
      id: workspaceSummaryEventType.shape.id,
      entryIDs: z.array(id())
    })
  })
]);

type WorkspaceStateEvent = z.infer<typeof workspaceStateEventType>;

const emitWorkspaceStateEvent: EmitEvent<{
  [workspaceID: string]: WorkspaceStateEvent;
}> = (workspaceID, event) => {
  emitEvent(`${workspaceID}:workspace`, event);
};
const subscribeToWorkspaceStateEvents: SubscribeToEvent<{
  [workspaceID: string]: WorkspaceStateEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:workspace`, callback, {
    ...options,
    schema: workspaceStateEventType
  });
};

export { workspaceStateEventType, emitWorkspaceStateEvent, subscribeToWorkspaceStateEvents };
export type { WorkspaceStateEvent };
