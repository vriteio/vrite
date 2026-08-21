import { entries, workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { hasPermission, type SessionData } from "#backend/lib/policy";
import { toEntryID, toUUID, toWorkspaceID } from "#backend/lib/primitives";
import { Auth } from "#backend/services/auth";
import { and, eq, isNull } from "drizzle-orm";
import type { CollaborationContext } from "./types";

const permissionError = (reason: "Unauthorized" | "Forbidden") => {
  return Object.assign(new Error(reason), {
    code: reason === "Unauthorized" ? 4401 : 4403,
    reason
  });
};
const authenticateCollaboration = async (input: {
  documentName: string;
  requestHeaders: Headers;
  connectionConfig: {
    readOnly: boolean;
  };
}): Promise<CollaborationContext> => {
  const requestHeaders = new Headers(input.requestHeaders);
  let unaffiliatedSession: SessionData;

  try {
    unaffiliatedSession = await Auth.getSessionData({
      headers: requestHeaders,
      requireWorkspace: false
    });
  } catch {
    throw permissionError("Unauthorized");
  }

  if (unaffiliatedSession.type !== "session" || !unaffiliatedSession.session) {
    throw permissionError("Unauthorized");
  }

  let entryID;

  try {
    entryID = toUUID(input.documentName);
  } catch {
    throw permissionError("Forbidden");
  }

  const [entry] = await db
    .select({
      id: entries.id,
      workspaceID: entries.workspaceID,
      workspaceDeletingAt: workspaces.deletingAt
    })
    .from(entries)
    .innerJoin(workspaces, eq(workspaces.id, entries.workspaceID))
    .where(and(eq(entries.id, entryID), isNull(entries.deletedAt)))
    .limit(1);

  if (!entry || entry.workspaceDeletingAt) throw permissionError("Forbidden");

  const workspaceID = toWorkspaceID(entry.workspaceID);

  requestHeaders.set("x-workspace-id", workspaceID);

  let auth: SessionData;

  try {
    auth = await Auth.getSessionData({ headers: requestHeaders });
  } catch {
    throw permissionError("Forbidden");
  }

  if (auth.type !== "session" || !auth.session || auth.workspaceID !== workspaceID) {
    throw permissionError("Forbidden");
  }

  const canWrite =
    auth.session.admin === true ||
    auth.session.permissions.some((permission) => hasPermission(permission, "content"));

  input.connectionConfig.readOnly = !canWrite;

  return {
    auth,
    entryID: toEntryID(entry.id),
    workspaceID
  };
};

export { authenticateCollaboration };
