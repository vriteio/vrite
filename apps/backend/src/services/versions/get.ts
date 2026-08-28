import { entries, entryVersionContributors, entryVersions } from "#backend/db";
import { mapVersion, type VersionDetails } from "#backend/lib/data";
import { type ServiceResolveContext, withAuthorization } from "#backend/lib/policy";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";

interface GetVersionInput {
  versionID: string;
  action?: "version:read" | "version:revert";
}

type ResolvedGetVersion = Awaited<ReturnType<typeof resolveGetVersion>>;

async function resolveGetVersion({
  database,
  input,
  workspaceID
}: ServiceResolveContext<GetVersionInput>) {
  const versionID = toUUID(input.versionID);
  const [row] = await database
    .select({ collectionID: entries.collectionID, version: entryVersions })
    .from(entryVersions)
    .innerJoin(
      entries,
      and(
        eq(entries.workspaceID, entryVersions.workspaceID),
        eq(entries.id, entryVersions.entryID),
        isNull(entries.deletedAt)
      )
    )
    .where(and(eq(entryVersions.id, versionID), eq(entryVersions.workspaceID, workspaceID)));

  if (!row) throw new ORPCError("NOT_FOUND", { message: "Version not found" });

  return row;
}

const getVersion = withAuthorization<GetVersionInput, ResolvedGetVersion, VersionDetails>(
  {
    actions: ({ input, resolved }) => ({
      entries: [
        {
          action: input.action || "version:read",
          collectionID: resolved.collectionID
        }
      ]
    }),
    resolve: resolveGetVersion
  },
  async ({ database, input, resolved, workspaceID }) => {
    const versionID = toUUID(input.versionID);
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
      resolved.version,
      contributors.map(({ membershipID }) => membershipID)
    );
  }
);

export { getVersion };
