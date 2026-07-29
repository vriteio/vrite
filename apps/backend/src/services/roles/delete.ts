import { toUUID, toUserID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { invitations, memberships, roles, workspaces } from "#backend/db";
import { Auth } from "#backend/services/auth";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const deleteRole = async (input: { id: string; workspaceID: string }): Promise<void> => {
  const roleID = toUUID(input.id);
  const workspaceID = toUUID(input.workspaceID);
  const affectedUserIDs = await db.transaction(async (tx) => {
    await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");
    const [role] = await tx
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleID), eq(roles.workspaceID, workspaceID)))
      .for("update");

    if (!role) throw new ORPCError("NOT_FOUND", { message: "Role not found" });
    if (role.baseRole) {
      throw new ORPCError("BAD_REQUEST", { message: "Base roles cannot be deleted" });
    }

    const [viewerRole] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.workspaceID, workspaceID), eq(roles.baseRole, "viewer")));

    if (!viewerRole) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Viewer role not found" });
    }

    const affected = await tx
      .select({ userID: memberships.userID })
      .from(memberships)
      .where(and(eq(memberships.roleID, roleID), eq(memberships.workspaceID, workspaceID)));

    await tx
      .update(memberships)
      .set({ roleID: viewerRole.id, updatedAt: new Date() })
      .where(and(eq(memberships.roleID, roleID), eq(memberships.workspaceID, workspaceID)));
    await tx
      .update(invitations)
      .set({ roleID: viewerRole.id })
      .where(and(eq(invitations.roleID, roleID), eq(invitations.workspaceID, workspaceID)));
    await tx.delete(roles).where(and(eq(roles.id, roleID), eq(roles.workspaceID, workspaceID)));

    return affected.map(({ userID }) => userID);
  });

  await Promise.all(
    affectedUserIDs.map((userID) =>
      Auth.invalidateSessionData({
        userID: toUserID(userID),
        workspaceID: input.workspaceID
      })
    )
  );
};

export { deleteRole };
