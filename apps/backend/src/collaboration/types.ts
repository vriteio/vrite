import type { ContentNode } from "#backend/lib/content";
import type { SessionData } from "#backend/lib/policy";

interface CollaborationContext {
  auth?: SessionData;
  collectionID?: string;
  contributorID?: string;
  entryID?: string;
  resource?: "entry" | "schema";
  schemaID?: string;
  schemaMigrationReadOnly?: boolean;
  workspaceID?: string;
}
interface ContentSnapshot {
  document: ContentNode;
  hash: string;
}

export type { CollaborationContext, ContentSnapshot };
