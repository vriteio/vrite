import { contents, entries, workspaces } from "#backend/db";
import {
  emitEntryEvent,
  subscribeToEntryEvents,
  subscribeToMembershipEvents,
  subscribeToRoleEvents,
  subscribeToWorkspaceStateEvents
} from "#backend/events";
import { hasPermission } from "#backend/lib/middleware";
import { toEntryID, toUUID, toWorkspaceID } from "#backend/lib/id";
import { Auth, isSessionAuthorizationEvent, type SessionData } from "#backend/services/auth";
import { Database } from "@hocuspocus/extension-database";
import { Redis as RedisExtension } from "@hocuspocus/extension-redis";
import { Hocuspocus, type WebSocketLike } from "@hocuspocus/server";
import { and, eq, isNull } from "drizzle-orm";
import { config } from "#backend/lib/config";
import { db } from "#backend/lib/postgres";
import { applyUpdate, Doc, encodeStateAsUpdate, XmlElement, XmlText } from "yjs";
import { MAX_CONTENT_NAME_LENGTH } from "#backend/lib/content-name";

interface CollaborationContext {
  auth?: SessionData;
  entryID?: string;
  workspaceID?: string;
}

const permissionError = (reason: "Unauthorized" | "Forbidden") => {
  return Object.assign(new Error(reason), {
    code: reason === "Unauthorized" ? 4401 : 4403,
    reason
  });
};

const logCollaborationInitializationError = (source: "database" | "redis", error: unknown) => {
  console.error(`Collaboration ${source} initialization failed`, { error });
};

class CollaborationRedisExtension extends RedisExtension {
  async afterLoadDocument(...args: Parameters<RedisExtension["afterLoadDocument"]>): Promise<void> {
    try {
      await super.afterLoadDocument(...args);
    } catch (error) {
      logCollaborationInitializationError("redis", error);
      throw error;
    }
  }
}

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
    unaffiliatedSession = await Auth.getSessionData(requestHeaders, {
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

  if (!entry || entry.workspaceDeletingAt) {
    throw permissionError("Forbidden");
  }

  const workspaceID = toWorkspaceID(entry.workspaceID);

  requestHeaders.set("x-workspace-id", workspaceID);

  let auth: SessionData;

  try {
    auth = await Auth.getSessionData(requestHeaders);
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

const getDocumentTitle = (document: Doc): string | null => {
  const titleElement = document
    .getXmlFragment("default")
    .toArray()
    .find((node): node is XmlElement => {
      return node instanceof XmlElement && node.nodeName === "title";
    });
  const title =
    titleElement
      ?.toArray()
      .filter((node): node is XmlText => node instanceof XmlText)
      .map((node) => node.toString())
      .join("")
      .trim() || "";

  if (title.length > MAX_CONTENT_NAME_LENGTH) return null;

  return title || "Untitled";
};

const collaborationRedisURL = new URL(config.REDIS_URL);
const collaborationRedisDatabase = Number(collaborationRedisURL.pathname.slice(1) || "0");
const collaborationRedis = new CollaborationRedisExtension({
  host: collaborationRedisURL.hostname,
  port: Number(collaborationRedisURL.port || "6379"),
  prefix: "andesine:collaboration",
  options: {
    db: collaborationRedisDatabase,
    ...(collaborationRedisURL.username && {
      username: decodeURIComponent(collaborationRedisURL.username)
    }),
    ...(collaborationRedisURL.password && {
      password: decodeURIComponent(collaborationRedisURL.password)
    }),
    ...(collaborationRedisURL.protocol === "rediss:" && { tls: {} })
  }
});
const collab = new Hocuspocus<CollaborationContext>({
  onAuthenticate: authenticateCollaboration,
  extensions: [
    collaborationRedis,
    new Database({
      async fetch({ documentName }) {
        try {
          const [content] = await db
            .select({ state: contents.state })
            .from(contents)
            .innerJoin(entries, eq(entries.id, contents.entryID))
            .where(and(eq(contents.entryID, toUUID(documentName)), isNull(entries.deletedAt)))
            .limit(1);

          if (content?.state) {
            return new Uint8Array(content.state);
          }

          return null;
        } catch (error) {
          logCollaborationInitializationError("database", error);
          throw error;
        }
      },
      async store({ documentName, state }) {
        const entryID = toUUID(documentName);
        const stored = await db.transaction(async (tx) => {
          const [entry] = await tx
            .select({
              id: entries.id,
              workspaceID: entries.workspaceID,
              name: entries.name
            })
            .from(entries)
            .where(and(eq(entries.id, entryID), isNull(entries.deletedAt)))
            .for("update");

          if (!entry) return null;

          const [content] = await tx
            .select({ state: contents.state })
            .from(contents)
            .where(eq(contents.entryID, entryID));
          const persistedDocument = new Doc();

          if (content?.state) {
            applyUpdate(persistedDocument, new Uint8Array(content.state));
          }

          applyUpdate(persistedDocument, state);

          const mergedState = encodeStateAsUpdate(persistedDocument);
          const title = getDocumentTitle(persistedDocument);

          await tx
            .insert(contents)
            .values({
              entryID,
              workspaceID: entry.workspaceID,
              state: Buffer.from(mergedState),
              updatedAt: new Date()
            })
            .onConflictDoUpdate({
              target: contents.entryID,
              set: { state: Buffer.from(mergedState), updatedAt: new Date() }
            });

          if (title !== null && entry.name !== title) {
            await tx
              .update(entries)
              .set({ name: title, updatedAt: new Date() })
              .where(and(eq(entries.id, entryID), isNull(entries.deletedAt)));

            return { entry, title };
          }

          return null;
        });

        if (stored) {
          emitEntryEvent(toWorkspaceID(stored.entry.workspaceID), {
            action: "entry:update",
            data: {
              id: toEntryID(stored.entry.id),
              name: stored.title
            }
          });
        }
      }
    })
  ]
});

const resetAffectedConnections = (event: Parameters<typeof isSessionAuthorizationEvent>[1]) => {
  const affectedSockets = new Set<WebSocketLike>();

  for (const document of collab.documents.values()) {
    for (const connection of document.getConnections()) {
      const auth = connection.context.auth;

      if (auth && isSessionAuthorizationEvent(auth, event)) {
        affectedSockets.add(connection.webSocket);
      }
    }
  }

  for (const socket of affectedSockets) {
    socket.close(4205, "Reset Connection");
  }
};

subscribeToMembershipEvents("*", resetAffectedConnections);
subscribeToRoleEvents("*", resetAffectedConnections);

subscribeToEntryEvents("*", (event) => {
  if (event.action !== "entry:delete") return;

  for (const entryID of event.data.ids) {
    collab.closeConnections(entryID);
  }
});

subscribeToWorkspaceStateEvents("*", (event) => {
  if (event.action !== "workspace:delete") return;

  for (const entryID of event.data.entryIDs) {
    collab.closeConnections(entryID);
  }
});

const updateDocumentTitle = async (documentName: string, title: string): Promise<void> => {
  const connection = await collab.openDirectConnection(documentName);

  try {
    await connection.transact((document) => {
      const fragment = document.getXmlFragment("default");

      let titleElement = fragment.toArray().find((node): node is XmlElement => {
        return node instanceof XmlElement && node.nodeName === "title";
      });

      if (!titleElement) {
        titleElement = new XmlElement("title");
        fragment.insert(0, [titleElement]);
      }

      const hasContentBlock = fragment
        .toArray()
        .some((node) => node instanceof XmlElement && node.nodeName !== "title");

      if (!hasContentBlock) {
        fragment.push([new XmlElement("paragraph")]);
      }

      const currentTitle = titleElement
        .toArray()
        .filter((node): node is XmlText => node instanceof XmlText)
        .map((node) => node.toString())
        .join("");

      if (currentTitle === title) return;

      if (titleElement.length > 0) {
        titleElement.delete(0, titleElement.length);
      }

      if (title) {
        titleElement.insert(0, [new XmlText(title)]);
      }
    });
  } finally {
    await connection.disconnect();
  }
};

const shutdownCollaboration = async (timeoutMs: number): Promise<boolean> => {
  collab.closeConnections();
  collab.flushPendingStores();

  const deadline = Date.now() + timeoutMs;

  while (collab.getDocumentsCount() > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  if (collab.getDocumentsCount() > 0) return false;

  await collab.hooks("onDestroy", { instance: collab });

  return true;
};

export { collab, shutdownCollaboration, updateDocumentTitle };
