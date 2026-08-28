import { getCurrentDocumentContent, type ContentSnapshot } from "#backend/collaboration";
import {
  contents,
  entries,
  entryVersionActivity,
  entryVersionActivityContributors,
  entryVersionContributors,
  entryVersions
} from "#backend/db";
import { getContentTitle } from "#backend/lib/content";
import { mapVersion, type VersionDetails, type VersionReason } from "#backend/lib/data";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { withAuthorization } from "#backend/lib/policy";

interface CreateVersionInput {
  entryID: string;
  reason: VersionReason;
  contributorIDs: string[];
  name?: string;
  sourceVersionID?: string;
  snapshot?: ContentSnapshot;
}
interface ResolvedCreateVersion {
  collectionID: string | null;
}

const createVersion = withAuthorization<CreateVersionInput, ResolvedCreateVersion, VersionDetails>(
  {
    actions: ({ resolved }) => ({
      entries: [{ action: "version:create", collectionID: resolved.collectionID }]
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
        )
        .for("update");

      if (!entry) throw new ORPCError("NOT_FOUND", { message: "Entry not found" });

      return entry;
    },
    transaction: "locked-workspace"
  },
  async ({ database, input, workspaceID }) => {
    const entryID = toUUID(input.entryID);
    const inputContributorIDs = input.contributorIDs.map(toUUID);
    const snapshot =
      input.snapshot || (await getCurrentDocumentContent(input.entryID, workspaceID));
    const activityContributors =
      input.reason === "revert"
        ? []
        : await database
            .select({ membershipID: entryVersionActivityContributors.membershipID })
            .from(entryVersionActivityContributors)
            .where(eq(entryVersionActivityContributors.entryID, entryID));
    const contributorIDs = [
      ...new Set([
        ...inputContributorIDs,
        ...activityContributors.map(({ membershipID }) => membershipID)
      ])
    ];

    if (input.sourceVersionID) {
      const [source] = await database
        .select({ id: entryVersions.id })
        .from(entryVersions)
        .where(
          and(
            eq(entryVersions.id, toUUID(input.sourceVersionID)),
            eq(entryVersions.workspaceID, workspaceID),
            eq(entryVersions.entryID, entryID)
          )
        );

      if (!source) throw new ORPCError("NOT_FOUND", { message: "Source version not found" });
    }

    const [created] = await database
      .insert(entryVersions)
      .values({
        workspaceID,
        entryID,
        entryName: getContentTitle(snapshot.document),
        document: snapshot.document,
        hash: snapshot.hash,
        name: input.name,
        reason: input.reason,
        sourceVersionID: input.sourceVersionID ? toUUID(input.sourceVersionID) : null
      })
      .returning();

    if (contributorIDs.length > 0) {
      await database.insert(entryVersionContributors).values(
        contributorIDs.map((membershipID) => ({
          workspaceID,
          versionID: created.id,
          membershipID
        }))
      );
    }

    const [content] = await database
      .select({ hash: contents.hash })
      .from(contents)
      .where(eq(contents.entryID, entryID));

    if (content?.hash === snapshot.hash) {
      await database.delete(entryVersionActivity).where(eq(entryVersionActivity.entryID, entryID));
    }

    return mapVersion(created, contributorIDs);
  }
);

export { createVersion };
