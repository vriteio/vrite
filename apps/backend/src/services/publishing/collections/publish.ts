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
import { and, eq, isNull } from "drizzle-orm";

const publishCollection = async (input: {
  workspaceID: string;
  collectionID: string;
  channel: string;
  contributorIDs: string[];
}): Promise<{
  createdVersions: VersionSummary[];
  entryIDs: string[];
  publishedEntries: number;
}> => {
  const workspaceID = toUUID(input.workspaceID);
  const collectionID = toUUID(input.collectionID);

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

    const [collection] = await tx
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.id, collectionID),
          eq(collections.workspaceID, workspaceID),
          isNull(collections.deletedAt)
        )
      );

    if (!collection) throw new ORPCError("NOT_FOUND", { message: "Collection not found" });

    const tree = await loadPublishingTree(tx, workspaceID);

    if (!isCollectionPublishingEnabled(tree, collectionID)) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Publishing is not enabled for this collection"
      });
    }

    const currentEntryIDs = await getSubtreeEntryIDs(tx, workspaceID, tree, collectionID);

    await syncEntrySnapshots(workspaceID, currentEntryIDs);

    const result = await publishEntries(tx, {
      workspaceID,
      entryIDs: currentEntryIDs,
      channel: input.channel,
      contributorIDs: input.contributorIDs
    });

    return { ...result, entryIDs: currentEntryIDs };
  });
};

export { publishCollection };
