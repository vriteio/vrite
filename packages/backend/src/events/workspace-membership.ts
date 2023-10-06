import { Observable } from "@trpc/server/observable";
import { Role, WorkspaceMembership } from "#database";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type WorkspaceMembershipEvent =
  | { action: "create"; data: { id: string; pendingInvite: boolean } & WorkspaceMembership }
  | {
      action: "update";
      data: {
        id: string;
        userId: string;
        role?: Role;
        pendingInvite?: boolean;
        profile?: {
          fullName?: string;
          username?: string;
          avatar?: string;
        };
      } & Partial<WorkspaceMembership>;
    }
  | {
      action: "delete";
      data: { id: string; userId: string };
    };

const publishWorkspaceMembershipEvent = createEventPublisher<WorkspaceMembershipEvent>(
  (workspaceId: string) => `workspaceMemberships:${workspaceId}`
);
const subscribeToWorkspaceMembershipEvents = (
  ctx: Context,
  workspaceId: string
): Observable<WorkspaceMembershipEvent, unknown> => {
  return createEventSubscription<WorkspaceMembershipEvent>(
    ctx,
    `workspaceMemberships:${workspaceId}`
  );
};

export { publishWorkspaceMembershipEvent, subscribeToWorkspaceMembershipEvents };
export type { WorkspaceMembershipEvent };
