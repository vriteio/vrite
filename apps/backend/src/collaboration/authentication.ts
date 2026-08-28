import { entries, workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { loadAuthorizedCollectionTree, type SessionData } from "#backend/lib/policy";
import { toCollectionID, toEntryID, toUUID, toWorkspaceID } from "#backend/lib/primitives";
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
      collectionID: entries.collectionID,
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

  const collectionID = entry.collectionID ? toCollectionID(entry.collectionID) : null;
  const authorization = await loadAuthorizedCollectionTree({ auth });

  if (!authorization.canEntry(collectionID, "entry:read")) {
    throw permissionError("Forbidden");
  }

  const canWrite = authorization.canEntry(collectionID, "entry:update");

  input.connectionConfig.readOnly = !canWrite;

  return {
    auth,
    entryID: toEntryID(entry.id),
    workspaceID
  };
};

export { authenticateCollaboration };
