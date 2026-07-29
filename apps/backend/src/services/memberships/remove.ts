import { toUUID, toUserID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { memberships, roles, users, workspaces } from "#backend/db";
import { Auth } from "#backend/services/auth";
import { and, eq, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const removeMember = async (input: { id: string; workspaceID: string }): Promise<void> => {
  const workspaceID = toUUID(input.workspaceID);
  const memberID = toUUID(input.id);
  const userID = await db.transaction(async (tx) => {
    await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");
    const [membership] = await tx
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, memberID), eq(memberships.workspaceID, workspaceID)))
      .for("update");

    if (!membership) {
      throw new ORPCError("NOT_FOUND", { message: "Membership not found" });
    }

    const [role] = await tx
      .select()
      .from(roles)
      .where(and(eq(roles.id, membership.roleID), eq(roles.workspaceID, workspaceID)));

    if (!role) throw new ORPCError("NOT_FOUND", { message: "Role not found" });

    if (role.baseRole === "admin") {
      const [result] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(memberships)
        .where(and(eq(memberships.workspaceID, workspaceID), eq(memberships.roleID, role.id)));

      if (result.count <= 1) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot remove the last admin from the workspace"
        });
      }
    }

    await tx
      .delete(memberships)
      .where(and(eq(memberships.id, memberID), eq(memberships.workspaceID, workspaceID)));
    const [fallback] = await tx
      .select({ workspaceID: memberships.workspaceID })
      .from(memberships)
      .where(eq(memberships.userID, membership.userID))
      .limit(1);

    await tx
      .update(users)
      .set({ currentWorkspaceID: fallback?.workspaceID ?? null, updatedAt: new Date() })
      .where(and(eq(users.id, membership.userID), eq(users.currentWorkspaceID, workspaceID)));

    return membership.userID;
  });

  await Auth.invalidateSessionData({
    userID: toUserID(userID),
    workspaceID: input.workspaceID
  });
};

export { removeMember };
