import {
  subscribeToCollectionEvents,
  subscribeToEntryEvents,
  subscribeToGroupEvents,
  subscribeToMembershipEvents,
  subscribeToRoleEvents,
  subscribeToWorkspaceStateEvents
} from "#backend/events";
import { collections, entries } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { canReadRestrictedCollections, isSessionAuthorizationEvent } from "#backend/lib/policy";
import { toUUID } from "#backend/lib/primitives";
import { type Hocuspocus, type WebSocketLike } from "@hocuspocus/server";
import { eq } from "drizzle-orm";
import type { CollaborationContext } from "./types";

const registerCollaborationEvents = (collab: Hocuspocus<CollaborationContext>): void => {
  const resetRestrictedConnections = (workspaceID: string) => {
    const affectedSockets = new Set<WebSocketLike>();

    for (const document of collab.documents.values()) {
      for (const connection of document.getConnections()) {
        const auth = connection.context.auth;

        if (auth?.workspaceID === workspaceID && !canReadRestrictedCollections(auth)) {
          affectedSockets.add(connection.webSocket);
        }
      }
    }

    for (const socket of affectedSockets) {
      socket.close(4205, "Reset Connection");
    }
  };
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
  const resetUserConnections = (workspaceID: string, userIDs: string[]) => {
    const affectedUserIDs = new Set(userIDs);
    const affectedSockets = new Set<WebSocketLike>();

    for (const document of collab.documents.values()) {
      for (const connection of document.getConnections()) {
        const auth = connection.context.auth;
        const userID = auth?.session?.userID;

        if (auth?.workspaceID === workspaceID && userID && affectedUserIDs.has(userID)) {
          affectedSockets.add(connection.webSocket);
        }
      }
    }

    for (const socket of affectedSockets) {
      socket.close(4205, "Reset Connection");
    }
  };

  subscribeToMembershipEvents("*", resetAffectedConnections);
  subscribeToRoleEvents("*", (event, channel) => {
    const workspaceID = channel.split(":")[0];

    if (event.action !== "role:create" && event.affectedUserIDs) {
      resetUserConnections(workspaceID, event.affectedUserIDs);
      return;
    }

    resetAffectedConnections(event);
  });
  subscribeToGroupEvents("*", (event, channel) => {
    const workspaceID = channel.split(":")[0];

    if ("affectedUserIDs" in event && event.affectedUserIDs) {
      resetUserConnections(workspaceID, event.affectedUserIDs);
    }
  });

  subscribeToCollectionEvents("*", (event) => {
    const changesAccess =
      (event.action === "collection:move" && event.data.restrictedBoundaryChanged === true) ||
      (event.action === "collection:update" && event.data.restricted !== undefined);

    if (!changesAccess) return;

    void (async () => {
      const [collection] = await db
        .select({ workspaceID: collections.workspaceID })
        .from(collections)
        .where(eq(collections.id, toUUID(event.data.id)));

      if (!collection) return;

      resetRestrictedConnections(collection.workspaceID);
    })();
  });

  subscribeToEntryEvents("*", (event) => {
    if (event.action === "entry:move" && event.data.restrictedBoundaryChanged === true) {
      void (async () => {
        const [entry] = await db
          .select({ workspaceID: entries.workspaceID })
          .from(entries)
          .where(eq(entries.id, toUUID(event.data.id)));

        if (!entry) return;

        resetRestrictedConnections(entry.workspaceID);
      })();
      return;
    }

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
};

export { registerCollaborationEvents };
