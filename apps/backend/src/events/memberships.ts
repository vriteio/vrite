import { inviteType, membershipType } from "#backend/db";
import { emitEvent, EmitEvent, subscribeToEvent, SubscribeToEvent } from "#backend/lib/messaging";
import { id } from "#backend/lib/primitives";
import * as z from "zod";

declare module "#backend/lib/messaging/events" {
  interface Events {
    [membershipEvent: `${string}:memberships`]: MembershipEvent;
  }
}

const membershipEventType = z.union([
  z.object({
    action: z.literal("membership:add"),
    memberID: id().optional(),
    data: membershipType
  }),
  z.object({
    action: z.literal("membership:update"),
    memberID: id().optional(),
    data: z.object({
      ...membershipType.pick({ id: true }).shape,
      ...membershipType.omit({ id: true }).partial().shape
    })
  }),
  z.object({
    action: z.literal("membership:remove"),
    memberID: id().optional(),
    data: z.object({ id: membershipType.shape.id })
  }),
  z.object({
    action: z.literal("invite:create"),
    memberID: id().optional(),
    data: inviteType
  }),
  z.object({
    action: z.literal("invite:revoke"),
    memberID: id().optional(),
    data: z.object({ id: inviteType.shape.id })
  })
]);

type MembershipEvent = z.infer<typeof membershipEventType>;

const emitMembershipEvent: EmitEvent<{
  [workspaceID: string]: MembershipEvent;
}> = (workspaceID, event) => {
  emitEvent(`${workspaceID}:memberships`, event);
};
const subscribeToMembershipEvents: SubscribeToEvent<{
  [workspaceID: string]: MembershipEvent;
}> = (workspaceID, callback, options) => {
  return subscribeToEvent(`${workspaceID}:memberships`, callback, {
    ...options,
    schema: membershipEventType
  });
};

export { membershipEventType, emitMembershipEvent, subscribeToMembershipEvents };
export type { MembershipEvent };
