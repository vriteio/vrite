import { toUUID, toUserID, toWorkspaceID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { memberships, workspaces } from "#backend/db";
import { eq, inArray } from "drizzle-orm";

const listAllWorkspaces = async (userIDs: string[]) => {
  const ids = userIDs.map(toUUID);

  if (ids.length === 0) return [];

  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      userID: memberships.userID
    })
    .from(memberships)
    .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceID))
    .where(inArray(memberships.userID, ids));

  return rows.map((row) => ({
    id: toWorkspaceID(row.id),
    name: row.name,
    userID: toUserID(row.userID)
  }));
};

export { listAllWorkspaces };
