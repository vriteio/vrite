import {
  entries,
  entryPublications,
  entryVersionContributors,
  entryVersions,
  publishingChannels
} from "#backend/db";
import { mapVersionSummary, type VersionSummary } from "#backend/lib/data";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { withAuthorization } from "#backend/lib/policy";

interface EntryPublicationChannel {
  builtIn: boolean;
  code: string;
  name: string;
}
interface EntryPublication {
  channel: EntryPublicationChannel;
  publishedAt: string;
  version: VersionSummary;
}

interface ListEntryPublicationsInput {
  entryID: string;
}
interface ResolvedEntryPublication {
  collectionID: string | null;
}

const listEntryPublications = withAuthorization<
  ListEntryPublicationsInput,
  ResolvedEntryPublication,
  EntryPublication[]
>(
  {
    actions: ({ resolved }) => ({
      entries: [{ action: "publishing:read", collectionID: resolved.collectionID }]
    }),
    resolve: async ({ database, input, workspaceID }) => {
      const [entry] = await database
        .select({ collectionID: entries.collectionID })
        .from(entries)
        .where(
          and(
            eq(entries.id, toUUID(input.entryID)),
            eq(entries.workspaceID, workspaceID),
            isNull(entries.deletedAt)
          )
        );

      if (!entry) throw new ORPCError("NOT_FOUND", { message: "Entry not found" });

      return entry;
    }
  },
  async ({ database, input, workspaceID }) => {
    const entryID = toUUID(input.entryID);

    const publications = await database
      .select({
        channel: publishingChannels,
        publishedAt: entryPublications.updatedAt,
        version: entryVersions
      })
      .from(entryPublications)
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
        and(eq(entryPublications.workspaceID, workspaceID), eq(entryPublications.entryID, entryID))
      )
      .orderBy(desc(publishingChannels.builtIn), asc(publishingChannels.name));
    const versionIDs = publications.map(({ version }) => version.id);
    const contributors =
      versionIDs.length > 0
        ? await database
            .select({
              membershipID: entryVersionContributors.membershipID,
              versionID: entryVersionContributors.versionID
            })
            .from(entryVersionContributors)
            .where(
              and(
                eq(entryVersionContributors.workspaceID, workspaceID),
                inArray(entryVersionContributors.versionID, versionIDs)
              )
            )
        : [];
    const contributorsByVersionID = new Map<string, string[]>();

    for (const contributor of contributors) {
      const contributorIDs = contributorsByVersionID.get(contributor.versionID) || [];

      contributorIDs.push(contributor.membershipID);
      contributorsByVersionID.set(contributor.versionID, contributorIDs);
    }

    return publications.map(({ channel, publishedAt, version }) => ({
      channel: {
        builtIn: channel.builtIn,
        code: channel.code,
        name: channel.name
      },
      publishedAt: publishedAt.toISOString(),
      version: mapVersionSummary(version, contributorsByVersionID.get(version.id) || [])
    }));
  }
);

export { listEntryPublications };
export type { EntryPublication, EntryPublicationChannel };
