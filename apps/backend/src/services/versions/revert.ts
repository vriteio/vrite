import { replaceDocumentContent } from "#backend/collaboration";
import { entries, entryPublications, entryVersions, publishingChannels } from "#backend/db";
import type { VersionDetails } from "#backend/lib/data";
import { PUBLISHED_CHANNEL_CODE, type PublishingEntryStatus } from "#backend/lib/publishing";
import { withAuthorization } from "#backend/lib/policy";
import { toUUID, toVersionID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { createVersion } from "./create";
import { getVersion } from "./get";

interface RevertVersionInput {
  versionID: string;
  contributorIDs: string[];
}
interface ResolvedRevertVersion {
  collectionID: string | null;
  publishedHash: string | null;
  publishedVersionID: string | null;
}
interface RevertVersionResult {
  createdVersions: VersionDetails[];
  publishingEntries: PublishingEntryStatus[];
  version: VersionDetails;
}

const publishedVersions = alias(entryVersions, "published_versions");

const revertVersion = withAuthorization<
  RevertVersionInput,
  ResolvedRevertVersion,
  RevertVersionResult
>(
  {
    actions: ({ resolved }) => ({
      entries: [{ action: "version:revert", collectionID: resolved.collectionID }]
    }),
    resolve: async ({ database, input, workspaceID }) => {
      const [version] = await database
        .select({
          collectionID: entries.collectionID,
          publishedHash: publishedVersions.hash,
          publishedVersionID: entryPublications.versionID
        })
        .from(entryVersions)
        .innerJoin(
          entries,
          and(
            eq(entries.id, entryVersions.entryID),
            eq(entries.workspaceID, workspaceID),
            isNull(entries.deletedAt)
          )
        )
        .leftJoin(
          publishingChannels,
          and(
            eq(publishingChannels.workspaceID, workspaceID),
            eq(publishingChannels.code, PUBLISHED_CHANNEL_CODE)
          )
        )
        .leftJoin(
          entryPublications,
          and(
            eq(entryPublications.entryID, entryVersions.entryID),
            eq(entryPublications.channelID, publishingChannels.id)
          )
        )
        .leftJoin(publishedVersions, eq(publishedVersions.id, entryPublications.versionID))
        .where(
          and(
            eq(entryVersions.id, toUUID(input.versionID)),
            eq(entryVersions.workspaceID, workspaceID)
          )
        );

      if (!version) throw new ORPCError("NOT_FOUND", { message: "Version not found" });

      return version;
    },
    transaction: "locked-workspace",
    tree: true
  },
  async ({ auth, authorization, authorizationScope, database, input, resolved, workspaceID }) => {
    const target = await getVersion({
      ...input,
      action: "version:revert",
      auth,
      skipAuthorization: authorizationScope
    });
    const previous = await replaceDocumentContent(target.entryID, target.document, workspaceID);
    const createdVersions: VersionDetails[] = [];

    try {
      const [existing] = await database
        .select({ id: entryVersions.id })
        .from(entryVersions)
        .where(
          and(
            eq(entryVersions.workspaceID, workspaceID),
            eq(entryVersions.entryID, toUUID(target.entryID)),
            eq(entryVersions.hash, previous.hash)
          )
        )
        .limit(1);

      if (!existing) {
        const safetyVersion = await createVersion({
          auth,
          entryID: target.entryID,
          reason: "auto",
          contributorIDs: input.contributorIDs,
          snapshot: previous,
          skipAuthorization: authorizationScope
        });

        createdVersions.push(safetyVersion);
      }

      const version = await createVersion({
        auth,
        entryID: target.entryID,
        reason: "revert",
        contributorIDs: input.contributorIDs,
        sourceVersionID: target.id,
        snapshot: {
          document: target.document,
          hash: target.hash
        },
        skipAuthorization: authorizationScope
      });

      createdVersions.push(version);

      return {
        createdVersions,
        publishingEntries: [
          {
            entryID: target.entryID,
            hasUnpublishedChanges:
              authorization.isPublishingEnabled(resolved.collectionID) &&
              (!resolved.publishedVersionID || target.hash !== resolved.publishedHash),
            versionID: resolved.publishedVersionID ? toVersionID(resolved.publishedVersionID) : null
          }
        ],
        version
      };
    } catch (error) {
      try {
        await replaceDocumentContent(target.entryID, previous.document, workspaceID);
      } catch (rollbackError) {
        console.error("Failed to roll back reverted document", {
          error: rollbackError,
          entryID: target.entryID
        });
      }

      throw error;
    }
  }
);

export { revertVersion };
