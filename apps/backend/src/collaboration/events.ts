import {
  subscribeToEntryEvents,
  subscribeToMembershipEvents,
  subscribeToRoleEvents,
  subscribeToWorkspaceStateEvents
} from "#backend/events";
import { isSessionAuthorizationEvent } from "#backend/lib/policy";
import { type Hocuspocus, type WebSocketLike } from "@hocuspocus/server";
import type { CollaborationContext } from "./types";

const registerCollaborationEvents = (collab: Hocuspocus<CollaborationContext>): void => {
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
};

export { registerCollaborationEvents };
