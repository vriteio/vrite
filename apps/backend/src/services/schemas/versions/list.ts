import { schemaVersionContributors, schemaVersions } from "#backend/db";
import { mapSchemaVersionSummary, type SchemaVersionSummary } from "#backend/lib/data";
import { withAuthorization } from "#backend/lib/policy";
import { toSchemaVersionID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { type SchemaVersionListInput, resolveSchemaVersionList } from "./resolve";

interface ListSchemaVersionsInput extends SchemaVersionListInput {
  cursor?: string;
  limit?: number;
}
interface ListSchemaVersionsResult {
  versions: SchemaVersionSummary[];
  nextCursor: string | null;
}

type ResolvedSchemaVersionList = Awaited<ReturnType<typeof resolveSchemaVersionList>>;

const listSchemaVersions = withAuthorization<
  ListSchemaVersionsInput,
  ResolvedSchemaVersionList,
  ListSchemaVersionsResult
>(
  {
    actions: ({ resolved }) => ({
      collections: [{ action: "collection:read", collectionID: resolved.collectionID }]
    }),
    resolve: resolveSchemaVersionList
  },
  async ({ database, input, resolved, workspaceID }) => {
    const limit = input.limit || 50;
    const filters = [
      eq(schemaVersions.workspaceID, workspaceID),
      eq(schemaVersions.schemaID, resolved.schema.id)
    ];

    if (input.cursor) {
      const cursorID = toUUID(input.cursor);
      const [cursor] = await database
        .select({ createdAt: schemaVersions.createdAt })
        .from(schemaVersions)
        .where(
          and(
            eq(schemaVersions.id, cursorID),
            eq(schemaVersions.workspaceID, workspaceID),
            eq(schemaVersions.schemaID, resolved.schema.id)
          )
        );

      if (!cursor) throw new ORPCError("BAD_REQUEST", { message: "Cursor version not found" });

      filters.push(
        or(
          lt(schemaVersions.createdAt, cursor.createdAt),
          and(eq(schemaVersions.createdAt, cursor.createdAt), lt(schemaVersions.id, cursorID))
        )!
      );
    }

    const rows = await database
      .select()
      .from(schemaVersions)
      .where(and(...filters))
      .orderBy(desc(schemaVersions.createdAt), desc(schemaVersions.id))
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const versionIDs = pageRows.map(({ id }) => id);
    const contributorRows =
      versionIDs.length > 0
        ? await database
            .select({
              versionID: schemaVersionContributors.versionID,
              membershipID: schemaVersionContributors.membershipID
            })
            .from(schemaVersionContributors)
            .where(
              and(
                eq(schemaVersionContributors.workspaceID, workspaceID),
                inArray(schemaVersionContributors.versionID, versionIDs)
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
      versions: pageRows.map((version) => {
        return mapSchemaVersionSummary(
          version,
          resolved.collectionID,
          contributorsByVersion.get(version.id) || []
        );
      }),
      nextCursor: hasMore ? toSchemaVersionID(pageRows[pageRows.length - 1].id) : null
    };
  }
);

export { listSchemaVersions };
