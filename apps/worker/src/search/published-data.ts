import { entries } from "@andesine/backend/db/entries";
import { entryPublications, publishingChannels } from "@andesine/backend/db/publishing";
import { entryVersions } from "@andesine/backend/db/versions";
import type { PublishedSearchDocumentSource } from "@andesine/backend/lib/search";
import { toCollectionID, toEntryID, toUUID, toVersionID } from "@andesine/backend/lib/primitives";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../database";
import { getCollectionLineage, loadCollections } from "./current-data";

interface PublishedEntrySourcesInput {
  entryID: string;
  workspaceID: string;
}

const loadPublishedEntrySources = async (
  input: PublishedEntrySourcesInput
): Promise<PublishedSearchDocumentSource[]> => {
  const workspaceID = toUUID(input.workspaceID);
  const [collectionRows, publicationRows] = await Promise.all([
    loadCollections(input.workspaceID),
    db
      .select({
        channelCode: publishingChannels.code,
        channelID: publishingChannels.id,
        collectionID: entries.collectionID,
        document: entryVersions.document,
        entryID: entries.id,
        entryName: entryVersions.entryName,
        publishedAt: entryPublications.updatedAt,
        versionID: entryVersions.id
      })
      .from(entries)
      .innerJoin(
        entryPublications,
        and(
          eq(entryPublications.entryID, entries.id),
          eq(entryPublications.workspaceID, workspaceID)
        )
      )
      .innerJoin(
        publishingChannels,
        and(
          eq(publishingChannels.id, entryPublications.channelID),
          eq(publishingChannels.workspaceID, workspaceID)
        )
      )
      .innerJoin(
        entryVersions,
        and(
          eq(entryVersions.id, entryPublications.versionID),
          eq(entryVersions.workspaceID, workspaceID)
        )
      )
      .where(
        and(
          eq(entries.id, toUUID(input.entryID)),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      )
  ]);
  const root = collectionRows.find((collection) => collection.parentID === null);

  if (!root) return [];

  const collectionByID = new Map(collectionRows.map((collection) => [collection.id, collection]));

  return publicationRows.map((publication) => {
    const lineage = getCollectionLineage(publication.collectionID, collectionByID, root);
    const sourceCollection = lineage[lineage.length - 1] || root;
    const visibleLineage = lineage.filter((collection) => collection.parentID !== null);

    return {
      scope: "published",
      workspaceID: input.workspaceID,
      entryID: toEntryID(publication.entryID),
      collectionID: toCollectionID(sourceCollection.id),
      ancestorCollectionIDs: visibleLineage
        .slice(0, -1)
        .map((collection) => toCollectionID(collection.id)),
      restrictedBoundaryIDs: [],
      collectionPath: visibleLineage.map((collection) => collection.name),
      title: publication.entryName,
      content: publication.document,
      updatedAt: publication.publishedAt,
      channelID: publication.channelID,
      channelCode: publication.channelCode,
      versionID: toVersionID(publication.versionID)
    };
  });
};

export { loadPublishedEntrySources };
