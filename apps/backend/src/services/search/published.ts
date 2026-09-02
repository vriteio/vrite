import { collections, entries, entryPublications, publishingChannels } from "#backend/db";
import type {
  AskResult,
  PublishedAskInput,
  PublishedSearchInput,
  SearchDocument,
  SearchResult
} from "#backend/lib/search";
import { type Database, withAuthorization } from "#backend/lib/policy";
import { normalizePublishingChannelCode } from "#backend/lib/publishing";
import { toUUID, toVersionID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { ask, search, type SearchDocumentAuthorizer } from "./core";

const createDocumentAuthorizer = (
  channel: string,
  database: Database,
  workspaceID: string
): SearchDocumentAuthorizer => {
  return async (documents: SearchDocument[]): Promise<Set<string>> => {
    if (documents.length === 0) return new Set();

    const rows = await database
      .select({
        channelID: publishingChannels.id,
        entryID: entryPublications.entryID,
        versionID: entryPublications.versionID
      })
      .from(entryPublications)
      .innerJoin(
        publishingChannels,
        and(
          eq(publishingChannels.id, entryPublications.channelID),
          eq(publishingChannels.workspaceID, workspaceID),
          eq(publishingChannels.code, channel)
        )
      )
      .innerJoin(
        entries,
        and(
          eq(entries.id, entryPublications.entryID),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      )
      .where(
        and(
          eq(entryPublications.workspaceID, workspaceID),
          inArray(
            entryPublications.entryID,
            documents.map(({ entryID }) => toUUID(entryID))
          )
        )
      );
    const assignmentKeys = new Set(
      rows.map(({ channelID, entryID, versionID }) => {
        return `${entryID}:${channelID}:${toVersionID(versionID)}`;
      })
    );

    return new Set(
      documents.flatMap((document) => {
        if (document.scope !== "published") return [];

        const assignmentKey = `${toUUID(document.entryID)}:${document.channelID}:${document.versionID}`;

        return assignmentKeys.has(assignmentKey) ? [document.id] : [];
      })
    );
  };
};
const assertNonRootCollectionFilter = async (
  collectionID: string | undefined,
  database: Database,
  workspaceID: string
): Promise<void> => {
  if (!collectionID) return;

  const [collection] = await database
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(
        eq(collections.id, toUUID(collectionID)),
        eq(collections.workspaceID, workspaceID),
        isNotNull(collections.parentID),
        isNull(collections.deletedAt)
      )
    )
    .limit(1);

  if (!collection) throw new ORPCError("NOT_FOUND");
};

const searchPublished = withAuthorization<PublishedSearchInput, undefined, SearchResult>(
  {
    permissions: { session: true, key: ["read:publishing"] }
  },
  async ({ auth, database, input, workspaceID }) => {
    const channel = normalizePublishingChannelCode(input.channel);

    await assertNonRootCollectionFilter(input.collectionID, database, workspaceID);

    return search({
      ...input,
      channel,
      authorizeDocuments: createDocumentAuthorizer(channel, database, workspaceID),
      scope: "published",
      workspaceID: auth.workspaceID
    });
  }
);
const askPublished = withAuthorization<PublishedAskInput, undefined, AskResult>(
  {
    permissions: { session: true }
  },
  async ({ auth, database, input, workspaceID }) => {
    const channel = normalizePublishingChannelCode(input.channel);

    await assertNonRootCollectionFilter(input.collectionID, database, workspaceID);

    return ask({
      ...input,
      channel,
      authorizeDocuments: createDocumentAuthorizer(channel, database, workspaceID),
      query: input.question,
      scope: "published",
      workspaceID: auth.workspaceID
    });
  }
);

export { askPublished, searchPublished };
