import { workspaceType } from "#backend/db";
import { emitEvent, EmitEvent, subscribeToEvent, SubscribeToEvent } from "#backend/lib/events";
import { objectID } from "#backend/lib/mongo";
import * as z from "zod";

declare module "#backend/lib/events" {
  interface Events {
    [workspaceStateEvent: `${string}:workspace`]: WorkspaceStateEvent;
  }
}

const workspaceSummaryEventType = workspaceType.pick({
  id: true,
  name: true
});
const workspaceStateEventType = z.union([
  z.object({
    action: z.literal("workspace:create"),
    memberID: objectID().optional(),
    data: workspaceSummaryEventType
  }),
  z.object({
    action: z.literal("workspace:update"),
    memberID: objectID().optional(),
    data: z.object({
      ...workspaceSummaryEventType.pick({ id: true }).shape,
      ...workspaceSummaryEventType.omit({ id: true }).partial().shape
    })
  }),
  z.object({
    action: z.literal("workspace:delete"),
    memberID: objectID().optional(),
    data: z.object({ id: workspaceSummaryEventType.shape.id })
  })
]);

type WorkspaceStateEvent = z.infer<typeof workspaceStateEventType>;

const emitWorkspaceStateEvent: EmitEvent<{
  [workspaceID: string]: WorkspaceStateEvent;
}> = async (workspaceID, event) => {
  await emitEvent(`${workspaceID}:workspace`, event);
};
const subscribeToWorkspaceStateEvents: SubscribeToEvent<{
  [workspaceID: string]: WorkspaceStateEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:workspace`, callback, options);
};

export { workspaceStateEventType, emitWorkspaceStateEvent, subscribeToWorkspaceStateEvents };
export type { WorkspaceStateEvent };
