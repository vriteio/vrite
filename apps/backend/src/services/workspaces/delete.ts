import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { memberships, users, workspaces } from "#backend/db";
import { Auth } from "#backend/services/auth";
import { and, eq, ne } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const deleteWorkspace = async (input: { workspaceID: string; userID: string }) => {
  const workspaceID = toUUID(input.workspaceID);
  const userID = toUUID(input.userID);

  await db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

    const [fallback] = await tx
      .select({ workspaceID: memberships.workspaceID })
      .from(memberships)
      .where(and(eq(memberships.userID, userID), ne(memberships.workspaceID, workspaceID)))
      .limit(1);

    if (!fallback) {
      throw new ORPCError("BAD_REQUEST", { message: "Cannot delete your only workspace" });
    }

    await tx
      .update(users)
      .set({ currentWorkspaceID: fallback.workspaceID, updatedAt: new Date() })
      .where(and(eq(users.id, userID), eq(users.currentWorkspaceID, workspaceID)));
    await tx.delete(workspaces).where(eq(workspaces.id, workspaceID));
  });

  await Auth.invalidateSessionData({ workspaceID: input.workspaceID });
};

export { deleteWorkspace };
