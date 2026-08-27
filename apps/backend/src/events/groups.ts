import { groupType } from "#backend/db";
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
    [groupEvent: `${string}:groups`]: GroupEvent;
  }
}

const groupEventType = z.union([
  z.object({
    action: z.literal("group:create"),
    memberID: id().optional(),
    data: groupType.extend({
      memberIDs: z.array(id()),
      invitationIDs: z.array(id())
    })
  }),
  z.object({
    action: z.literal("group:update"),
    memberID: id().optional(),
    affectedUserIDs: z.array(id()).optional(),
    data: groupType.extend({
      memberIDs: z.array(id()),
      invitationIDs: z.array(id())
    })
  }),
  z.object({
    action: z.literal("group:delete"),
    memberID: id().optional(),
    affectedUserIDs: z.array(id()).optional(),
    data: z.object({ id: groupType.shape.id })
  }),
  z.object({
    action: z.literal("group:members-update"),
    memberID: id().optional(),
    affectedUserIDs: z.array(id()).optional(),
    data: z.object({
      id: groupType.shape.id,
      memberIDs: z.array(id()),
      invitationIDs: z.array(id())
    })
  }),
  z.object({
    action: z.literal("restricted-assignments:update"),
    memberID: id().optional(),
    affectedUserIDs: z.array(id()).optional(),
    data: z.object({ collectionID: id() })
  })
]);

type GroupEvent = z.infer<typeof groupEventType>;

const emitGroupEvent: EmitEvent<{
  [workspaceID: string]: GroupEvent;
}> = (workspaceID, event) => {
  emitEvent(`${workspaceID}:groups`, event);
};
const subscribeToGroupEvents: SubscribeToEvent<{
  [workspaceID: string]: GroupEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:groups`, callback, {
    ...options,
    schema: groupEventType
  });
};

export { emitGroupEvent, groupEventType, subscribeToGroupEvents };
export type { GroupEvent };
