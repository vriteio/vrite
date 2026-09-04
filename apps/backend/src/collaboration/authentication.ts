import {
  collectionSchemas,
  collections,
  entries,
  schemaMigrationCollections,
  schemaMigrations,
  workspaces
} from "#backend/db";
import { db } from "#backend/lib/adapters";
import { loadAuthorizedCollectionTree, type SessionData } from "#backend/lib/policy";
import { toCollectionID, toEntryID, toUUID, toWorkspaceID } from "#backend/lib/primitives";
import { Auth } from "#backend/services/auth";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
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

  const schemaDocument = input.documentName.startsWith("sch_");
  let documentID;

  try {
    documentID = toUUID(input.documentName);
  } catch {
    throw permissionError("Forbidden");
  }

  const [target] = schemaDocument
    ? await db
        .select({
          id: collectionSchemas.id,
          collectionID: collectionSchemas.collectionID,
          workspaceID: collectionSchemas.workspaceID,
          workspaceDeletingAt: workspaces.deletingAt
        })
        .from(collectionSchemas)
        .innerJoin(
          collections,
          and(
            eq(collections.workspaceID, collectionSchemas.workspaceID),
            eq(collections.id, collectionSchemas.collectionID),
            isNotNull(collections.parentID),
            isNull(collections.deletedAt)
          )
        )
        .innerJoin(workspaces, eq(workspaces.id, collectionSchemas.workspaceID))
        .where(and(eq(collectionSchemas.id, documentID), eq(collectionSchemas.enabled, true)))
        .limit(1)
    : await db
        .select({
          id: entries.id,
          collectionID: entries.collectionID,
          workspaceID: entries.workspaceID,
          workspaceDeletingAt: workspaces.deletingAt
        })
        .from(entries)
        .innerJoin(workspaces, eq(workspaces.id, entries.workspaceID))
        .where(and(eq(entries.id, documentID), isNull(entries.deletedAt)))
        .limit(1);

  if (!target || target.workspaceDeletingAt) throw permissionError("Forbidden");

  const workspaceID = toWorkspaceID(target.workspaceID);

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

  const collectionID = target.collectionID ? toCollectionID(target.collectionID) : null;
  const authorization = await loadAuthorizedCollectionTree({ auth });

  const canRead = schemaDocument
    ? authorization.canCollection(collectionID, "collection:read")
    : authorization.canEntry(collectionID, "entry:read");

  if (!canRead) {
    throw permissionError("Forbidden");
  }

  const canWrite = schemaDocument
    ? authorization.canCollection(collectionID, "collection:update")
    : authorization.canEntry(collectionID, "entry:update");
  const [activeMigration] = target.collectionID
    ? await db
        .select({ id: schemaMigrations.id })
        .from(schemaMigrationCollections)
        .innerJoin(
          schemaMigrations,
          and(
            eq(schemaMigrations.workspaceID, schemaMigrationCollections.workspaceID),
            eq(schemaMigrations.id, schemaMigrationCollections.migrationID)
          )
        )
        .where(
          and(
            eq(schemaMigrationCollections.workspaceID, target.workspaceID),
            eq(schemaMigrationCollections.collectionID, target.collectionID),
            inArray(schemaMigrations.status, ["queued", "running", "rolling_back"])
          )
        )
        .limit(1)
    : [];

  const schemaMigrationReadOnly = canWrite && Boolean(activeMigration);

  input.connectionConfig.readOnly = !canWrite || schemaMigrationReadOnly;

  return {
    auth,
    collectionID: collectionID || undefined,
    schemaMigrationReadOnly,
    ...(schemaDocument
      ? { resource: "schema" as const, schemaID: input.documentName }
      : { resource: "entry" as const, entryID: toEntryID(target.id) }),
    workspaceID
  };
};

export { authenticateCollaboration };
