import {
  contents,
  entries,
  entryPublications,
  entryVersionActivity,
  entryVersionActivityContributors,
  entryVersionContributors,
  entryVersions,
  publishingChannels
} from "#backend/db";
import type { db } from "#backend/lib/adapters";
import { hashContentDocument, type ContentNode } from "#backend/lib/content";
import { mapVersionSummary, type VersionSummary } from "#backend/lib/data/entry-version";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { normalizePublishingChannelName } from "./channel";

interface PublishEntriesInput {
  workspaceID: string;
  entryIDs: string[];
  channel: string;
  contributorIDs: string[];
}
interface PublishEntriesResult {
  createdVersions: VersionSummary[];
  publishedEntries: number;
}

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const EMPTY_DOCUMENT: ContentNode = { type: "doc", content: [] };
const publishEntries = async (
  tx: DatabaseTransaction,
  input: PublishEntriesInput
): Promise<PublishEntriesResult> => {
  if (input.entryIDs.length === 0) return { createdVersions: [], publishedEntries: 0 };

  const channelName = normalizePublishingChannelName(input.channel);
  const contributorIDs = [...new Set(input.contributorIDs.map(toUUID))];
  const [channel] = await tx
    .select({ id: publishingChannels.id })
    .from(publishingChannels)
    .where(
      and(
        eq(publishingChannels.workspaceID, input.workspaceID),
        eq(publishingChannels.name, channelName)
      )
    );

  if (!channel) throw new ORPCError("NOT_FOUND", { message: "Publishing channel not found" });

  const entryRows = await tx
    .select({ id: entries.id, name: entries.name })
    .from(entries)
    .where(
      and(
        eq(entries.workspaceID, input.workspaceID),
        inArray(entries.id, input.entryIDs),
        isNull(entries.deletedAt)
      )
    )
    .orderBy(asc(entries.id))
    .for("update");

  if (entryRows.length !== input.entryIDs.length) {
    throw new ORPCError("NOT_FOUND", { message: "Entry not found" });
  }

  const contentRows = await tx
    .select({ entryID: contents.entryID, document: contents.document, hash: contents.hash })
    .from(contents)
    .where(inArray(contents.entryID, input.entryIDs));
  const latestVersions = await tx
    .selectDistinctOn([entryVersions.entryID], {
      id: entryVersions.id,
      entryID: entryVersions.entryID,
      hash: entryVersions.hash
    })
    .from(entryVersions)
    .where(
      and(
        eq(entryVersions.workspaceID, input.workspaceID),
        inArray(entryVersions.entryID, input.entryIDs)
      )
    )
    .orderBy(entryVersions.entryID, desc(entryVersions.createdAt));
  const activityContributors = await tx
    .select({
      entryID: entryVersionActivityContributors.entryID,
      membershipID: entryVersionActivityContributors.membershipID
    })
    .from(entryVersionActivityContributors)
    .where(inArray(entryVersionActivityContributors.entryID, input.entryIDs));
  const contentByEntryID = new Map(contentRows.map((content) => [content.entryID, content]));
  const latestVersionByEntryID = new Map(
    latestVersions.map((version) => [version.entryID, version])
  );
  const activityContributorsByEntryID = new Map<string, string[]>();
  const createdVersions: VersionSummary[] = [];

  for (const contributor of activityContributors) {
    const entryContributors = activityContributorsByEntryID.get(contributor.entryID) || [];

    entryContributors.push(contributor.membershipID);
    activityContributorsByEntryID.set(contributor.entryID, entryContributors);
  }

  for (const entry of entryRows) {
    const content = contentByEntryID.get(entry.id);
    const document = content?.document || EMPTY_DOCUMENT;
    const hash = content?.hash || hashContentDocument(document);
    const latestVersion = latestVersionByEntryID.get(entry.id);
    let versionID = latestVersion?.id;

    if (!content?.document || !content.hash) {
      await tx
        .insert(contents)
        .values({
          workspaceID: input.workspaceID,
          entryID: entry.id,
          document,
          hash
        })
        .onConflictDoUpdate({
          target: contents.entryID,
          set: { document, hash, updatedAt: new Date() }
        });
    }

    if (!latestVersion || latestVersion.hash !== hash) {
      const [version] = await tx
        .insert(entryVersions)
        .values({
          workspaceID: input.workspaceID,
          entryID: entry.id,
          entryName: entry.name,
          document,
          hash,
          reason: "manual"
        })
        .returning();
      const versionContributorIDs = [
        ...new Set([...contributorIDs, ...(activityContributorsByEntryID.get(entry.id) || [])])
      ];

      versionID = version.id;

      if (versionContributorIDs.length > 0) {
        await tx.insert(entryVersionContributors).values(
          versionContributorIDs.map((membershipID) => ({
            workspaceID: input.workspaceID,
            versionID: version.id,
            membershipID
          }))
        );
      }

      createdVersions.push(mapVersionSummary(version, versionContributorIDs));
    }

    if (!versionID) throw new Error("Failed to resolve a version for publishing");

    await tx
      .insert(entryPublications)
      .values({
        workspaceID: input.workspaceID,
        entryID: entry.id,
        channelID: channel.id,
        versionID
      })
      .onConflictDoUpdate({
        target: [entryPublications.entryID, entryPublications.channelID],
        set: { versionID, updatedAt: new Date() }
      });
  }

  await tx
    .delete(entryVersionActivity)
    .where(inArray(entryVersionActivity.entryID, input.entryIDs));

  return { createdVersions, publishedEntries: entryRows.length };
};

export { publishEntries };
