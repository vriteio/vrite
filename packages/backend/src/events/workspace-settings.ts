import { Observable } from "@trpc/server/observable";
import { WorkspaceSettings } from "#collections";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type WorkspaceSettingsEvent = {
  action: "update";
  data: Partial<Omit<WorkspaceSettings, "id">>;
};

const publishWorkspaceSettingsEvent = createEventPublisher<WorkspaceSettingsEvent>(
  (workspaceId) => {
    return `workspaceSettings:${workspaceId}`;
  }
);
const subscribeToWorkspaceSettingsEvents = (
  ctx: Context,
  workspaceId: string
): Observable<WorkspaceSettingsEvent, unknown> => {
  return createEventSubscription<WorkspaceSettingsEvent>(ctx, `workspaceSettings:${workspaceId}`);
};

export { publishWorkspaceSettingsEvent, subscribeToWorkspaceSettingsEvents };
export type { WorkspaceSettingsEvent };
