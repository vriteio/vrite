import { entries, entryVersionContributors, entryVersions } from "#backend/db";
import { mapVersionSummary, type VersionSummary } from "#backend/lib/data";
import { toUUID, toVersionID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { withAuthorization } from "#backend/lib/policy";

interface ListVersionsInput {
  entryID: string;
  cursor?: string;
  limit?: number;
}
interface ResolvedVersionList {
  collectionID: string | null;
}

const listVersions = withAuthorization<
  ListVersionsInput,
  ResolvedVersionList,
  { versions: VersionSummary[]; nextCursor: string | null }
>(
  {
    actions: ({ resolved }) => ({
      entries: [{ action: "version:read", collectionID: resolved.collectionID }]
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
    const limit = input.limit || 50;
    const entryID = toUUID(input.entryID);
    const filters = [
      eq(entryVersions.workspaceID, workspaceID),
      eq(entryVersions.entryID, entryID)
    ];

    if (input.cursor) {
      const cursorID = toUUID(input.cursor);
      const [cursor] = await database
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

    const rows = await database
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
        ? await database
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
  }
);

export { listVersions };
