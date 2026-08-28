import { entries, entryVersionContributors, entryVersions } from "#backend/db";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { mapVersion, type VersionDetails } from "#backend/lib/data";
import { withAuthorization } from "#backend/lib/policy";

interface UpdateVersionInput {
  versionID: string;
  name: string | null;
}
interface ResolvedUpdateVersion {
  collectionID: string | null;
}

const updateVersion = withAuthorization<UpdateVersionInput, ResolvedUpdateVersion, VersionDetails>(
  {
    actions: ({ resolved }) => ({
      entries: [{ action: "version:update", collectionID: resolved.collectionID }]
    }),
    resolve: async ({ database, input, workspaceID }) => {
      const [version] = await database
        .select({ collectionID: entries.collectionID })
        .from(entryVersions)
        .innerJoin(
          entries,
          and(
            eq(entries.id, entryVersions.entryID),
            eq(entries.workspaceID, workspaceID),
            isNull(entries.deletedAt)
          )
        )
        .where(
          and(
            eq(entryVersions.id, toUUID(input.versionID)),
            eq(entryVersions.workspaceID, workspaceID)
          )
        )
        .for("update");

      if (!version) throw new ORPCError("NOT_FOUND", { message: "Version not found" });

      return version;
    },
    transaction: "locked-workspace"
  },
  async ({ database, input, workspaceID }) => {
    const versionID = toUUID(input.versionID);

    const [updated] = await database
      .update(entryVersions)
      .set({ name: input.name, updatedAt: new Date() })
      .where(and(eq(entryVersions.id, versionID), eq(entryVersions.workspaceID, workspaceID)))
      .returning();

    if (!updated) throw new ORPCError("NOT_FOUND", { message: "Version not found" });

    const contributors = await database
      .select({ membershipID: entryVersionContributors.membershipID })
      .from(entryVersionContributors)
      .where(
        and(
          eq(entryVersionContributors.workspaceID, workspaceID),
          eq(entryVersionContributors.versionID, versionID)
        )
      );

    return mapVersion(
      updated,
      contributors.map(({ membershipID }) => membershipID)
    );
  }
);

export { updateVersion };
