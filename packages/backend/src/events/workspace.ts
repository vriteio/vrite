import { Observable } from "@trpc/server/observable";
import { Workspace } from "#database";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type WorkspaceEvent =
  | { action: "update"; data: Partial<Workspace> & { id: string } }
  | { action: "delete"; data: { id: string } };

const publishWorkspaceEvent = createEventPublisher<WorkspaceEvent>((workspaceId) => {
  return `workspace:${workspaceId}`;
});
const subscribeToWorkspaceEvents = (
  ctx: Context,
  workspaceId: string
): Observable<WorkspaceEvent, unknown> => {
  return createEventSubscription<WorkspaceEvent>(ctx, `workspace:${workspaceId}`);
};

export { publishWorkspaceEvent, subscribeToWorkspaceEvents };
export type { WorkspaceEvent };
