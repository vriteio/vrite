import {
  entries,
  entryPublications,
  entryVersionContributors,
  entryVersions,
  publishingChannels
} from "#backend/db";
import { db } from "#backend/lib/adapters";
import { mapVersion, type VersionDetails } from "#backend/lib/data";
import { normalizePublishingChannelCode } from "#backend/lib/publishing";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";

const getPublishedEntryVersion = async (input: {
  workspaceID: string;
  entryID: string;
  channel: string;
}): Promise<VersionDetails> => {
  const workspaceID = toUUID(input.workspaceID);
  const entryID = toUUID(input.entryID);
  const channelCode = normalizePublishingChannelCode(input.channel);
  const [row] = await db
    .select({ version: entryVersions })
    .from(entryPublications)
    .innerJoin(
      publishingChannels,
      and(
        eq(publishingChannels.id, entryPublications.channelID),
        eq(publishingChannels.workspaceID, workspaceID),
        eq(publishingChannels.code, channelCode)
      )
    )
    .innerJoin(entryVersions, eq(entryVersions.id, entryPublications.versionID))
    .innerJoin(
      entries,
      and(
        eq(entries.id, entryPublications.entryID),
        eq(entries.workspaceID, workspaceID),
        isNull(entries.deletedAt)
      )
    )
    .where(eq(entryPublications.entryID, entryID));

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Published entry version not found" });
  }

  const contributors = await db
    .select({ membershipID: entryVersionContributors.membershipID })
    .from(entryVersionContributors)
    .where(
      and(
        eq(entryVersionContributors.workspaceID, workspaceID),
        eq(entryVersionContributors.versionID, row.version.id)
      )
    );

  return mapVersion(
    row.version,
    contributors.map(({ membershipID }) => membershipID)
  );
};

export { getPublishedEntryVersion };
