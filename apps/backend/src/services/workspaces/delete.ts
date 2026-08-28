import { entries, users, workspaces } from "#backend/db";
import { toEntryID, toUUID, toWorkspaceID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { withAuthorization } from "#backend/lib/policy";
import { ORPCError } from "@orpc/server";
import { eq, sql } from "drizzle-orm";

interface DeleteWorkspaceResult {
  entryIDs: string[];
  workspaceID: string | null;
}

const deleteWorkspaceOperation = async (input: {
  workspaceID: string;
  userID: string;
}): Promise<DeleteWorkspaceResult> => {
  const workspaceID = toUUID(input.workspaceID);
  const userID = toUUID(input.userID);

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) {
      const [user] = await tx
        .select({ currentWorkspaceID: users.currentWorkspaceID })
        .from(users)
        .where(eq(users.id, userID));

      return {
        entryIDs: [],
        workspaceID: user?.currentWorkspaceID ? toWorkspaceID(user.currentWorkspaceID) : null
      };
    }

    const workspaceEntries = await tx
      .select({ id: entries.id })
      .from(entries)
      .where(eq(entries.workspaceID, workspaceID));

    await tx
      .update(users)
      .set({
        currentWorkspaceID: sql`(
          select fallback_membership.workspace_id
          from memberships fallback_membership
          where fallback_membership.user_id = ${users.id}
            and fallback_membership.workspace_id <> ${workspaceID}
          order by fallback_membership.created_at
          limit 1
        )`,
        updatedAt: new Date()
      })
      .where(eq(users.currentWorkspaceID, workspaceID));
    const [user] = await tx
      .select({ currentWorkspaceID: users.currentWorkspaceID })
      .from(users)
      .where(eq(users.id, userID));

    await tx.delete(workspaces).where(eq(workspaces.id, workspaceID));

    return {
      entryIDs: workspaceEntries.map(({ id }) => toEntryID(id)),
      workspaceID: user?.currentWorkspaceID ? toWorkspaceID(user.currentWorkspaceID) : null
    };
  });
};
const deleteWorkspace = withAuthorization<Record<never, never>, undefined, DeleteWorkspaceResult>(
  { permissions: { session: true } },
  async ({ auth, workspaceID }) => {
    if (!auth.session?.admin) throw new ORPCError("FORBIDDEN");

    return deleteWorkspaceOperation({ userID: auth.session!.userID, workspaceID });
  }
);

export { deleteWorkspace };
