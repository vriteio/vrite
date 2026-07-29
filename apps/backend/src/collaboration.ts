import { contents, entries } from "#backend/db";
import { emitEntryEvent } from "#backend/events";
import { hasPermission } from "#backend/lib/middleware";
import { toEntryID, toUUID, toWorkspaceID } from "#backend/lib/id";
import { Auth, type SessionData } from "#backend/services/auth";
import { Database } from "@hocuspocus/extension-database";
import { Redis as RedisExtension } from "@hocuspocus/extension-redis";
import { Hocuspocus } from "@hocuspocus/server";
import { eq } from "drizzle-orm";
import { config } from "#backend/lib/config";
import { db } from "#backend/lib/postgres";
import { XmlElement, XmlText } from "yjs";
import type { Doc } from "yjs";

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
    .select({ id: entries.id, workspaceID: entries.workspaceID })
    .from(entries)
    .where(eq(entries.id, entryID))
    .limit(1);

  if (!entry) {
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

const getDocumentTitle = (document: Doc): string => {
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

  return title || "Untitled";
};

const collaborationRedisURL = new URL(config.REDIS_URL);
const collaborationRedisDatabase = Number(collaborationRedisURL.pathname.slice(1) || "0");
const collaborationRedis = new RedisExtension({
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
        const [content] = await db
          .select({ state: contents.state })
          .from(contents)
          .where(eq(contents.entryID, toUUID(documentName)))
          .limit(1);

        if (content?.state) {
          return new Uint8Array(content.state);
        }

        return null;
      },
      async store({ document, documentName, state }) {
        const entryID = toUUID(documentName);
        const title = getDocumentTitle(document);
        const previousEntry = await db.transaction(async (tx) => {
          const [entry] = await tx
            .select({
              id: entries.id,
              workspaceID: entries.workspaceID,
              name: entries.name
            })
            .from(entries)
            .where(eq(entries.id, entryID))
            .for("update");

          if (!entry) return null;

          await tx
            .insert(contents)
            .values({
              entryID,
              workspaceID: entry.workspaceID,
              state: Buffer.from(state),
              updatedAt: new Date()
            })
            .onConflictDoUpdate({
              target: contents.entryID,
              set: { state: Buffer.from(state), updatedAt: new Date() }
            });

          if (entry.name !== title) {
            await tx
              .update(entries)
              .set({ name: title, updatedAt: new Date() })
              .where(eq(entries.id, entryID));

            return entry;
          }

          return null;
        });

        if (previousEntry) {
          emitEntryEvent(toWorkspaceID(previousEntry.workspaceID), {
            action: "entry:update",
            data: {
              id: toEntryID(previousEntry.id),
              name: title
            }
          });
        }
      }
    })
  ]
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

export { collab, updateDocumentTitle };
