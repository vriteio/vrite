import { getCurrentDocumentContent, type ContentSnapshot } from "#backend/collaboration";
import {
  contents,
  entries,
  entryVersionActivity,
  entryVersionActivityContributors,
  entryVersionContributors,
  entryVersions
} from "#backend/db";
import { db } from "#backend/lib/adapters";
import { getContentTitle } from "#backend/lib/content";
import { mapVersion, type VersionDetails, type VersionReason } from "#backend/lib/data";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";
import {
  assertEntryPermission,
  loadRestrictedCollectionAccess,
  type SessionData
} from "#backend/lib/policy";

interface CreateVersionInput {
  auth: SessionData;
  workspaceID: string;
  entryID: string;
  reason: VersionReason;
  contributorIDs: string[];
  name?: string;
  sourceVersionID?: string;
  snapshot?: ContentSnapshot;
}

const createVersion = async (input: CreateVersionInput): Promise<VersionDetails> => {
  const access = await loadRestrictedCollectionAccess(input.auth);

  await assertEntryPermission(input.auth, access, input.entryID, "versions");

  const snapshot =
    input.snapshot || (await getCurrentDocumentContent(input.entryID, input.workspaceID));
  const workspaceID = toUUID(input.workspaceID);
  const entryID = toUUID(input.entryID);
  const inputContributorIDs = input.contributorIDs.map(toUUID);

  const result = await db.transaction(async (tx) => {
    const [entry] = await tx
      .select({ id: entries.id })
      .from(entries)
      .where(
        and(
          eq(entries.id, entryID),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      )
      .for("update");

    if (!entry) throw new ORPCError("NOT_FOUND", { message: "Entry not found" });

    const activityContributors =
      input.reason === "revert"
        ? []
        : await tx
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
      const [source] = await tx
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

    const [created] = await tx
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
      await tx.insert(entryVersionContributors).values(
        contributorIDs.map((membershipID) => ({
          workspaceID,
          versionID: created.id,
          membershipID
        }))
      );
    }

    const [content] = await tx
      .select({ hash: contents.hash })
      .from(contents)
      .where(eq(contents.entryID, entryID));

    if (content?.hash === snapshot.hash) {
      await tx.delete(entryVersionActivity).where(eq(entryVersionActivity.entryID, entryID));
    }

    return { contributorIDs, version: created };
  });

  return mapVersion(result.version, result.contributorIDs);
};

export { createVersion };
