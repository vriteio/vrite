import { toUUID, toUserID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { memberships, roles, workspaces } from "#backend/db";
import { Auth } from "#backend/services/auth";
import { and, eq, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const updateMember = async (input: {
  id: string;
  workspaceID: string;
  roleID: string;
}): Promise<void> => {
  const workspaceID = toUUID(input.workspaceID);
  const memberID = toUUID(input.id);
  const newRoleID = toUUID(input.roleID);
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

    const [existingRole] = await tx
      .select()
      .from(roles)
      .where(and(eq(roles.id, membership.roleID), eq(roles.workspaceID, workspaceID)));
    const [newRole] = await tx
      .select()
      .from(roles)
      .where(and(eq(roles.id, newRoleID), eq(roles.workspaceID, workspaceID)));

    if (!newRole) throw new ORPCError("BAD_REQUEST", { message: "Role not found" });

    if (existingRole?.baseRole === "admin" && newRole.baseRole !== "admin") {
      const [adminRole] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.workspaceID, workspaceID), eq(roles.baseRole, "admin")));

      if (!adminRole) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Admin role not found" });
      }

      const [result] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(memberships)
        .where(and(eq(memberships.workspaceID, workspaceID), eq(memberships.roleID, adminRole.id)));

      if (result.count <= 1) {
        throw new ORPCError("BAD_REQUEST", {
          message: "At least one admin is required in the workspace"
        });
      }
    }

    await tx
      .update(memberships)
      .set({ roleID: newRole.id, updatedAt: new Date() })
      .where(and(eq(memberships.id, memberID), eq(memberships.workspaceID, workspaceID)));

    return membership.userID;
  });

  await Auth.invalidateSessionData({
    userID: toUserID(userID),
    workspaceID: input.workspaceID
  });
};

export { updateMember };
