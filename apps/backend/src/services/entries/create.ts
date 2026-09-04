import { rankBetweenNeighbors, toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { collections, contents, effectiveSchemaRevisions, entries, type Entry } from "#backend/db";
import type { ContentNode } from "#backend/lib/content";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { normalizeEntryName } from "#backend/lib/validation";
import { withAuthorization } from "#backend/lib/policy";
import type { PublishingEntryStatus } from "#backend/lib/publishing";
import { getResolvedSchemaDefinition, migrateSchemaContentState } from "#backend/lib/schema";

interface CreateEntryResult {
  entry: Entry;
  publishingEntries: PublishingEntryStatus[];
}

const createInitialDocument = (name: string): ContentNode => ({
  type: "doc",
  content: [
    {
      type: "title",
      ...(name ? { content: [{ type: "text", text: name }] } : {})
    },
    { type: "paragraph" }
  ]
});

const createEntry = withAuthorization<Partial<Entry>, undefined, CreateEntryResult>(
  {
    actions: ({ input }) => ({
      entries: [{ action: "entry:create", collectionID: input.collectionID }]
    }),
    transaction: "locked-workspace",
    tree: true
  },
  async ({ authorization, database, input, workspaceID }) => {
    const entryID = input.id ? toUUID(input.id) : crypto.randomUUID();
    const collectionID = input.collectionID ? toUUID(input.collectionID) : null;
    const name = normalizeEntryName(input.name ?? "Untitled");

    const entry = await (async () => {
      if (collectionID) {
        const [parent] = await database
          .select({ id: collections.id })
          .from(collections)
          .where(
            and(
              eq(collections.id, collectionID),
              eq(collections.workspaceID, workspaceID),
              isNull(collections.deletedAt)
            )
          )
          .for("update");

        if (!parent) throw new ORPCError("BAD_REQUEST", { message: "Collection not found" });
      }

      const siblingFilter = collectionID
        ? and(
            eq(entries.workspaceID, workspaceID),
            eq(entries.collectionID, collectionID),
            isNull(entries.deletedAt)
          )
        : and(
            eq(entries.workspaceID, workspaceID),
            isNull(entries.collectionID),
            isNull(entries.deletedAt)
          );
      const [last] = await database
        .select({ rank: entries.rank })
        .from(entries)
        .where(siblingFilter)
        .orderBy(desc(entries.rank))
        .limit(1);
      const rank = rankBetweenNeighbors(last?.rank);

      await database
        .insert(entries)
        .values({
          id: entryID,
          workspaceID,
          collectionID,
          name,
          rank
        })
        .onConflictDoNothing({ target: entries.id });
      const [created] = await database
        .select()
        .from(entries)
        .where(
          and(
            eq(entries.id, entryID),
            eq(entries.workspaceID, workspaceID),
            isNull(entries.deletedAt)
          )
        );

      if (!created) {
        throw new ORPCError("BAD_REQUEST", { message: "Entry ID belongs to another workspace" });
      }

      const [activeRevision] = created.collectionID
        ? await database
            .select({
              definition: effectiveSchemaRevisions.definition,
              id: effectiveSchemaRevisions.id
            })
            .from(effectiveSchemaRevisions)
            .where(
              and(
                eq(effectiveSchemaRevisions.workspaceID, workspaceID),
                eq(effectiveSchemaRevisions.collectionID, created.collectionID),
                eq(effectiveSchemaRevisions.active, true)
              )
            )
            .limit(1)
        : [];
      const initialContent = activeRevision
        ? migrateSchemaContentState({
            defaultMode: "new-entry",
            document: createInitialDocument(created.name),
            schema: getResolvedSchemaDefinition(activeRevision.definition),
            state: null
          })
        : null;

      await database
        .insert(contents)
        .values({
          entryID: created.id,
          workspaceID: created.workspaceID,
          ...(initialContent && {
            document: initialContent.document,
            hash: initialContent.hash,
            schemaRevisionID: activeRevision!.id,
            state: initialContent.state
          })
        })
        .onConflictDoNothing({ target: contents.entryID });

      return created;
    })();

    const mappedEntry = {
      id: toEntryID(entry.id),
      name: entry.name,
      order: entry.rank,
      collectionID: entry.collectionID ? toCollectionID(entry.collectionID) : undefined
    };

    return {
      entry: mappedEntry,
      publishingEntries: [
        {
          entryID: mappedEntry.id,
          hasUnpublishedChanges: authorization.isPublishingEnabled(entry.collectionID),
          versionID: null
        }
      ]
    };
  }
);

export { createEntry };
