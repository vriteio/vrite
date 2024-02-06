import { Observable } from "@trpc/server/observable";
import { Role } from "#collections";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type RoleEvent =
  | {
      action: "create";
      data: Role;
    }
  | { action: "update"; data: Partial<Role> & { id: string } }
  | { action: "delete"; data: { id: string; newRole: Role } };

const publishRoleEvent = createEventPublisher((workspaceId) => `roles:${workspaceId}`);
const subscribeToRoleEvents = (
  ctx: Context,
  workspaceId: string
): Observable<RoleEvent, unknown> => {
  return createEventSubscription<RoleEvent>(ctx, `roles:${workspaceId}`);
};

export { publishRoleEvent, subscribeToRoleEvents };
export type { RoleEvent };
