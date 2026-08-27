import { contents, entries, type Entry } from "#backend/db";
import { db } from "#backend/lib/adapters";
import {
  getContentBlocks,
  serializeContentDocument,
  type ContentBlocks,
  type ContentNode
} from "#backend/lib/content";
import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { applyUpdate, Doc } from "yjs";
import {
  assertEntryAccess,
  loadRestrictedCollectionAccess,
  type SessionData
} from "#backend/lib/policy";

interface EntryDetails extends Entry {
  updatedAt: string;
  content: ContentNode;
  fragments: ContentBlocks["fragments"];
  properties: ContentBlocks["properties"];
}
const getEntry = async (input: {
  auth: SessionData;
  id: string;
  workspaceID: string;
}): Promise<EntryDetails> => {
  const access = await loadRestrictedCollectionAccess(input.auth);

  await assertEntryAccess(input.auth, access, input.id);

  const [row] = await db
    .select({
      id: entries.id,
      name: entries.name,
      rank: entries.rank,
      collectionID: entries.collectionID,
      contentState: contents.state,
      contentDocument: contents.document,
      contentUpdatedAt: contents.updatedAt
    })
    .from(entries)
    .innerJoin(contents, eq(contents.entryID, entries.id))
    .where(
      and(
        eq(entries.id, toUUID(input.id)),
        eq(entries.workspaceID, toUUID(input.workspaceID)),
        isNull(entries.deletedAt)
      )
    )
    .limit(1);

  if (!row) throw new ORPCError("NOT_FOUND");

  const document = new Doc();

  if (row.contentState) {
    applyUpdate(document, new Uint8Array(row.contentState));
  }

  const content = row.contentDocument || serializeContentDocument(document);
  const { fragments, properties } = getContentBlocks(content);

  return {
    id: toEntryID(row.id),
    name: row.name,
    order: row.rank,
    collectionID: row.collectionID ? toCollectionID(row.collectionID) : undefined,
    updatedAt: row.contentUpdatedAt.toISOString(),
    content,
    fragments,
    properties
  };
};

export { getEntry };
export type { EntryDetails };
