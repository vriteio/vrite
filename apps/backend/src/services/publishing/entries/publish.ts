import { entries, workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import {
  isCollectionPublishingEnabled,
  loadPublishingTree,
  publishEntries,
  syncEntrySnapshots
} from "#backend/lib/publishing";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";

const publishEntry = async (input: {
  workspaceID: string;
  entryID: string;
  channel: string;
  contributorIDs: string[];
}) => {
  const workspaceID = toUUID(input.workspaceID);
  const entryID = toUUID(input.entryID);

  await syncEntrySnapshots(workspaceID, [entryID]);
  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

    const [entry] = await tx
      .select({ collectionID: entries.collectionID })
      .from(entries)
      .where(
        and(
          eq(entries.id, entryID),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      );

    if (!entry) throw new ORPCError("NOT_FOUND", { message: "Entry not found" });

    const tree = await loadPublishingTree(tx, workspaceID);

    if (!isCollectionPublishingEnabled(tree, entry.collectionID)) {
      throw new ORPCError("BAD_REQUEST", { message: "Publishing is not enabled for this entry" });
    }

    return publishEntries(tx, {
      workspaceID,
      entryIDs: [entryID],
      channel: input.channel,
      contributorIDs: input.contributorIDs
    });
  });
};

export { publishEntry };
