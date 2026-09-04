import { schemaVersionContributors } from "#backend/db";
import { mapSchemaVersion, type SchemaVersionDetails } from "#backend/lib/data";
import { withAuthorization } from "#backend/lib/policy";
import { and, eq } from "drizzle-orm";
import { type SchemaVersionInput, resolveSchemaVersion } from "./resolve";

type ResolvedGetSchemaVersion = Awaited<ReturnType<typeof resolveSchemaVersion>>;

const getSchemaVersion = withAuthorization<
  SchemaVersionInput,
  ResolvedGetSchemaVersion,
  SchemaVersionDetails
>(
  {
    actions: ({ resolved }) => ({
      collections: [{ action: "collection:read", collectionID: resolved.collectionID }]
    }),
    resolve: resolveSchemaVersion
  },
  async ({ database, resolved, workspaceID }) => {
    const contributors = await database
      .select({ membershipID: schemaVersionContributors.membershipID })
      .from(schemaVersionContributors)
      .where(
        and(
          eq(schemaVersionContributors.workspaceID, workspaceID),
          eq(schemaVersionContributors.versionID, resolved.version.id)
        )
      );

    return mapSchemaVersion(
      resolved.version,
      resolved.collectionID,
      contributors.map(({ membershipID }) => membershipID)
    );
  }
);

export { getSchemaVersion };
