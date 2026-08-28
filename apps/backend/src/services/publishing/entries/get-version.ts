import {
  entries,
  entryPublications,
  entryVersionContributors,
  entryVersions,
  publishingChannels
} from "#backend/db";
import { mapVersion, type VersionDetails } from "#backend/lib/data";
import { normalizePublishingChannelCode } from "#backend/lib/publishing";
import { type Database, withAuthorization, withPublicWorkspace } from "#backend/lib/policy";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";

interface PublishedEntryVersionInput {
  entryID: string;
  channel: string;
}
interface PublishedEntryVersionSource {
  collectionID: string | null;
  version: VersionDetails;
}

const loadPublishedEntryVersion = async (
  database: Database,
  workspaceID: string,
  input: PublishedEntryVersionInput
): Promise<PublishedEntryVersionSource> => {
  const entryID = toUUID(input.entryID);
  const channelCode = normalizePublishingChannelCode(input.channel);
  const [row] = await database
    .select({ collectionID: entries.collectionID, version: entryVersions })
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

  const contributors = await database
    .select({ membershipID: entryVersionContributors.membershipID })
    .from(entryVersionContributors)
    .where(
      and(
        eq(entryVersionContributors.workspaceID, workspaceID),
        eq(entryVersionContributors.versionID, row.version.id)
      )
    );

  return {
    collectionID: row.collectionID,
    version: mapVersion(
      row.version,
      contributors.map(({ membershipID }) => membershipID)
    )
  };
};
const getPublishedEntryVersion = withAuthorization<
  PublishedEntryVersionInput,
  PublishedEntryVersionSource,
  VersionDetails
>(
  {
    actions: ({ resolved }) => ({
      entries: [{ action: "publishing:read", collectionID: resolved.collectionID }]
    }),
    resolve: ({ database, input, workspaceID }) => {
      return loadPublishedEntryVersion(database, workspaceID, input);
    }
  },
  async ({ resolved }) => resolved.version
);
const getPublicPublishedEntryVersion = withPublicWorkspace<
  PublishedEntryVersionInput,
  VersionDetails
>({}, async ({ database, input, workspaceID }) => {
  const source = await loadPublishedEntryVersion(database, workspaceID, input);

  return source.version;
});

export { getPublicPublishedEntryVersion, getPublishedEntryVersion };
