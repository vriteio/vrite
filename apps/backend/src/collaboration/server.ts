import { Hocuspocus } from "@hocuspocus/server";
import { collaborationActivity } from "./activity";
import { authenticateCollaboration } from "./authentication";
import { collaborationDatabase } from "./database";
import { registerCollaborationEvents } from "./events";
import { collaborationRedis } from "./redis";
import type { CollaborationContext } from "./types";

const collab = new Hocuspocus<CollaborationContext>({
  onAuthenticate: authenticateCollaboration,
  extensions: [collaborationActivity, collaborationRedis, collaborationDatabase]
});

registerCollaborationEvents(collab);

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

export { collab, shutdownCollaboration };
