import { schemaVersionContributors, schemaVersions } from "#backend/db";
import { mapSchemaVersion, type SchemaVersionDetails } from "#backend/lib/data";
import { withAuthorization } from "#backend/lib/policy";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { resolveSchemaVersion } from "./resolve";

interface UpdateSchemaVersionInput {
  versionID: string;
  name: string | null;
}

type ResolvedUpdateSchemaVersion = Awaited<ReturnType<typeof resolveSchemaVersion>>;

const updateSchemaVersion = withAuthorization<
  UpdateSchemaVersionInput,
  ResolvedUpdateSchemaVersion,
  SchemaVersionDetails
>(
  {
    actions: ({ resolved }) => ({
      collections: [{ action: "collection:update", collectionID: resolved.collectionID }]
    }),
    resolve: resolveSchemaVersion,
    transaction: "locked-workspace"
  },
  async ({ database, input, resolved, workspaceID }) => {
    const versionID = toUUID(input.versionID);
    const [updated] = await database
      .update(schemaVersions)
      .set({ name: input.name, updatedAt: new Date() })
      .where(and(eq(schemaVersions.id, versionID), eq(schemaVersions.workspaceID, workspaceID)))
      .returning();

    if (!updated) throw new ORPCError("NOT_FOUND", { message: "Schema version not found" });

    const contributors = await database
      .select({ membershipID: schemaVersionContributors.membershipID })
      .from(schemaVersionContributors)
      .where(
        and(
          eq(schemaVersionContributors.workspaceID, workspaceID),
          eq(schemaVersionContributors.versionID, versionID)
        )
      );

    return mapSchemaVersion(
      updated,
      resolved.collectionID,
      contributors.map(({ membershipID }) => membershipID)
    );
  }
);

export { updateSchemaVersion };
