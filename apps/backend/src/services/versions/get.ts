import { entries, entryVersionContributors, entryVersions } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { mapVersion, type VersionDetails } from "#backend/lib/data";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";
import {
  assertVersionAccess,
  loadRestrictedCollectionAccess,
  type SessionData
} from "#backend/lib/policy";

const getVersion = async (input: {
  auth: SessionData;
  workspaceID: string;
  versionID: string;
}): Promise<VersionDetails> => {
  const access = await loadRestrictedCollectionAccess(input.auth);
  const workspaceID = toUUID(input.workspaceID);
  const versionID = toUUID(input.versionID);

  await assertVersionAccess(input.auth, access, input.versionID);

  const [row] = await db
    .select({ version: entryVersions })
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

  const contributors = await db
    .select({ membershipID: entryVersionContributors.membershipID })
    .from(entryVersionContributors)
    .where(
      and(
        eq(entryVersionContributors.workspaceID, workspaceID),
        eq(entryVersionContributors.versionID, versionID)
      )
    );

  return mapVersion(
    row.version,
    contributors.map(({ membershipID }) => membershipID)
  );
};

export { getVersion };
