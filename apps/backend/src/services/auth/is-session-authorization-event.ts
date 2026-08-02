import type { WorkspaceEvent } from "#backend/events";
import type { SessionData } from "./get-session-data";

const isSessionAuthorizationEvent = (auth: SessionData, event: WorkspaceEvent): boolean => {
  if (auth.type !== "session" || !auth.session) return false;

  if (event.action === "membership:update" || event.action === "membership:remove") {
    return event.data.id === auth.session.memberID;
  }

  if (event.action === "role:delete") {
    return event.data.id === auth.session.roleID;
  }

  return (
    event.action === "role:update" &&
    event.data.permissions !== undefined &&
    event.data.id === auth.session.roleID
  );
};

export { isSessionAuthorizationEvent };
