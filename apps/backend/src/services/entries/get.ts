import { contents, entries, type Entry } from "#backend/db";
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
import { type ServiceResolveContext, withAuthorization } from "#backend/lib/policy";

interface EntryDetails extends Entry {
  updatedAt: string;
  content: ContentNode;
  fragments: ContentBlocks["fragments"];
  properties: ContentBlocks["properties"];
}
interface GetEntryInput {
  id: string;
}

type ResolvedGetEntry = Awaited<ReturnType<typeof resolveGetEntry>>;

async function resolveGetEntry({
  database,
  input,
  workspaceID
}: ServiceResolveContext<GetEntryInput>) {
  const [row] = await database
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
        eq(entries.workspaceID, workspaceID),
        isNull(entries.deletedAt)
      )
    )
    .limit(1);

  if (!row) throw new ORPCError("NOT_FOUND");

  return row;
}

const getEntry = withAuthorization<GetEntryInput, ResolvedGetEntry, EntryDetails>(
  {
    actions: ({ resolved }) => ({
      entries: [{ action: "entry:read", collectionID: resolved.collectionID }]
    }),
    resolve: resolveGetEntry
  },
  async ({ resolved }) => {
    const document = new Doc();

    if (resolved.contentState) {
      applyUpdate(document, new Uint8Array(resolved.contentState));
    }

    const content = resolved.contentDocument || serializeContentDocument(document);
    const { fragments, properties } = getContentBlocks(content);

    return {
      id: toEntryID(resolved.id),
      name: resolved.name,
      order: resolved.rank,
      collectionID: resolved.collectionID ? toCollectionID(resolved.collectionID) : undefined,
      updatedAt: resolved.contentUpdatedAt.toISOString(),
      content,
      fragments,
      properties
    };
  }
);

export { getEntry };
export type { EntryDetails };
