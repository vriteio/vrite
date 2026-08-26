import { collections, workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import {
  getSubtreeEntryIDs,
  isCollectionPublishingEnabled,
  loadPublishingTree,
  publishEntries,
  syncEntrySnapshots
} from "#backend/lib/publishing";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import type { VersionSummary } from "#backend/lib/data";
import { and, eq, inArray, isNull } from "drizzle-orm";

const publishCollection = async (input: {
  workspaceID: string;
  collectionIDs: string[];
  channel: string;
  contributorIDs: string[];
}): Promise<{
  createdVersions: VersionSummary[];
  entryIDs: string[];
  publishedEntries: number;
}> => {
  const workspaceID = toUUID(input.workspaceID);
  const collectionIDs = [...new Set(input.collectionIDs.map(toUUID))];

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

    const currentCollections = await tx
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          inArray(collections.id, collectionIDs),
          eq(collections.workspaceID, workspaceID),
          isNull(collections.deletedAt)
        )
      );

    if (currentCollections.length !== collectionIDs.length) {
      throw new ORPCError("NOT_FOUND", { message: "Collection not found" });
    }

    const tree = await loadPublishingTree(tx, workspaceID);

    if (collectionIDs.some((id) => !isCollectionPublishingEnabled(tree, id))) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Publishing is not enabled for this collection"
      });
    }

    const currentEntryIDs = [
      ...new Set(
        (
          await Promise.all(
            collectionIDs.map((id) => getSubtreeEntryIDs(tx, workspaceID, tree, id))
          )
        ).flat()
      )
    ];

    await syncEntrySnapshots(workspaceID, currentEntryIDs);

    const result = await publishEntries(tx, {
      workspaceID,
      entries: currentEntryIDs.map((entryID) => ({ entryID })),
      channel: input.channel,
      contributorIDs: input.contributorIDs
    });

    return { ...result, entryIDs: currentEntryIDs };
  });
};

export { publishCollection };
