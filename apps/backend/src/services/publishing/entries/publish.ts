import { entries, workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import {
  isCollectionPublishingEnabled,
  loadPublishingTree,
  publishEntries,
  type PublishEntryTarget,
  syncEntrySnapshots
} from "#backend/lib/publishing";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { SessionData } from "#backend/lib/policy";
import { authorizeEntrySources } from "../access";

const publishEntry = async (input: {
  auth: SessionData;
  workspaceID: string;
  entries: PublishEntryTarget[];
  channel: string;
  contributorIDs: string[];
}) => {
  const workspaceID = toUUID(input.workspaceID);
  const entriesByID = new Map<string, PublishEntryTarget>();

  for (const entry of input.entries) {
    const entryID = toUUID(entry.entryID);
    const versionID = entry.versionID ? toUUID(entry.versionID) : undefined;
    const existingEntry = entriesByID.get(entryID);

    if (existingEntry && existingEntry.versionID !== versionID) {
      throw new ORPCError("BAD_REQUEST", { message: "Conflicting entry publishing targets" });
    }

    entriesByID.set(entryID, { entryID, versionID });
  }

  const publishingEntries = [...entriesByID.values()];
  const entryIDs = publishingEntries.map((entry) => entry.entryID);
  const currentEntryIDs = publishingEntries.flatMap((entry) => {
    return entry.versionID ? [] : [entry.entryID];
  });

  await authorizeEntrySources(input.auth, entryIDs, "publishing");

  await syncEntrySnapshots(workspaceID, currentEntryIDs);
  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

    const currentEntries = await tx
      .select({ collectionID: entries.collectionID, id: entries.id })
      .from(entries)
      .where(
        and(
          inArray(entries.id, entryIDs),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      );

    if (currentEntries.length !== entryIDs.length) {
      throw new ORPCError("NOT_FOUND", { message: "Entry not found" });
    }

    const tree = await loadPublishingTree(tx, workspaceID);

    if (currentEntries.some((entry) => !isCollectionPublishingEnabled(tree, entry.collectionID))) {
      throw new ORPCError("BAD_REQUEST", { message: "Publishing is not enabled for this entry" });
    }

    return publishEntries(tx, {
      workspaceID,
      entries: publishingEntries,
      channel: input.channel,
      contributorIDs: input.contributorIDs
    });
  });
};

export { publishEntry };
