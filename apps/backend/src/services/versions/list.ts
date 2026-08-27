import { entries, entryVersionContributors, entryVersions } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { mapVersionSummary, type VersionSummary } from "#backend/lib/data";
import { toUUID, toVersionID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import {
  assertEntryPermission,
  loadRestrictedCollectionAccess,
  type SessionData
} from "#backend/lib/policy";

const listVersions = async (input: {
  auth: SessionData;
  workspaceID: string;
  entryID: string;
  cursor?: string;
  limit?: number;
}): Promise<{ versions: VersionSummary[]; nextCursor: string | null }> => {
  const limit = input.limit || 50;
  const access = await loadRestrictedCollectionAccess(input.auth);
  const workspaceID = toUUID(input.workspaceID);
  const entryID = toUUID(input.entryID);
  const filters = [eq(entryVersions.workspaceID, workspaceID), eq(entryVersions.entryID, entryID)];

  await assertEntryPermission(input.auth, access, input.entryID, "read:versions");

  const [entry] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(
      and(eq(entries.id, entryID), eq(entries.workspaceID, workspaceID), isNull(entries.deletedAt))
    );

  if (!entry) throw new ORPCError("NOT_FOUND", { message: "Entry not found" });

  if (input.cursor) {
    const cursorID = toUUID(input.cursor);
    const [cursor] = await db
      .select({ createdAt: entryVersions.createdAt })
      .from(entryVersions)
      .where(
        and(
          eq(entryVersions.id, cursorID),
          eq(entryVersions.workspaceID, workspaceID),
          eq(entryVersions.entryID, entryID)
        )
      );

    if (!cursor) throw new ORPCError("BAD_REQUEST", { message: "Cursor version not found" });

    filters.push(
      or(
        lt(entryVersions.createdAt, cursor.createdAt),
        and(eq(entryVersions.createdAt, cursor.createdAt), lt(entryVersions.id, cursorID))
      )!
    );
  }

  const rows = await db
    .select({ version: entryVersions })
    .from(entryVersions)
    .where(and(...filters))
    .orderBy(desc(entryVersions.createdAt), desc(entryVersions.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const versionIDs = pageRows.map(({ version }) => version.id);
  const contributorRows =
    versionIDs.length > 0
      ? await db
          .select({
            versionID: entryVersionContributors.versionID,
            membershipID: entryVersionContributors.membershipID
          })
          .from(entryVersionContributors)
          .where(
            and(
              eq(entryVersionContributors.workspaceID, workspaceID),
              inArray(entryVersionContributors.versionID, versionIDs)
            )
          )
      : [];
  const contributorsByVersion = new Map<string, string[]>();

  for (const contributor of contributorRows) {
    const contributors = contributorsByVersion.get(contributor.versionID) || [];

    contributors.push(contributor.membershipID);
    contributorsByVersion.set(contributor.versionID, contributors);
  }

  return {
    versions: pageRows.map(({ version }) => {
      return mapVersionSummary(version, contributorsByVersion.get(version.id) || []);
    }),
    nextCursor: hasMore ? toVersionID(pageRows[pageRows.length - 1].version.id) : null
  };
};

export { listVersions };
