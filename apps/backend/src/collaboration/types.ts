import type { ContentNode } from "#backend/lib/content";
import type { SessionData } from "#backend/lib/policy";

interface CollaborationContext {
  auth?: SessionData;
  contributorID?: string;
  entryID?: string;
  workspaceID?: string;
}
interface ContentSnapshot {
  document: ContentNode;
  hash: string;
}

export type { CollaborationContext, ContentSnapshot };
