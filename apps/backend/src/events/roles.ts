import { roleType } from "#backend/db";
import { emitEvent, EmitEvent, subscribeToEvent, SubscribeToEvent } from "#backend/lib/events";
import { id } from "#backend/lib/id";
import * as z from "zod";

declare module "#backend/lib/events" {
  interface Events {
    [roleEvent: `${string}:roles`]: RoleEvent;
  }
}

const roleEventType = z.union([
  z.object({
    action: z.literal("role:create"),
    memberID: id().optional(),
    data: roleType
  }),
  z.object({
    action: z.literal("role:update"),
    memberID: id().optional(),
    data: z.object({
      ...roleType.pick({ id: true }).shape,
      ...roleType.omit({ id: true }).partial().shape
    })
  }),
  z.object({
    action: z.literal("role:delete"),
    memberID: id().optional(),
    data: z.object({ id: roleType.shape.id })
  })
]);

type RoleEvent = z.infer<typeof roleEventType>;

const emitRoleEvent: EmitEvent<{
  [workspaceID: string]: RoleEvent;
}> = (workspaceID, event) => {
  emitEvent(`${workspaceID}:roles`, event);
};
const subscribeToRoleEvents: SubscribeToEvent<{
  [workspaceID: string]: RoleEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:roles`, callback, options);
};

export { roleEventType, emitRoleEvent, subscribeToRoleEvents };
export type { RoleEvent };
