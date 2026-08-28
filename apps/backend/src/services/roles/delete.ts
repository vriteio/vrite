import { toUUID, toUserID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import {
  collectionGroupRoles,
  collectionMemberRoles,
  groupMembers,
  invitations,
  memberships,
  roles,
  workspaces
} from "#backend/db";
import { withAuthorization } from "#backend/lib/policy";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

interface DeleteRoleInput {
  id: string;
}

const deleteRoleOperation = async (
  input: DeleteRoleInput & { workspaceID: string }
): Promise<{ affectedUserIDs: string[] }> => {
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

    const baseAffected = await tx
      .select({ userID: memberships.userID })
      .from(memberships)
      .where(and(eq(memberships.roleID, roleID), eq(memberships.workspaceID, workspaceID)));
    const directAffected = await tx
      .select({ userID: memberships.userID })
      .from(collectionMemberRoles)
      .innerJoin(memberships, eq(memberships.id, collectionMemberRoles.membershipID))
      .where(
        and(
          eq(collectionMemberRoles.workspaceID, workspaceID),
          eq(collectionMemberRoles.roleID, roleID)
        )
      );
    const groupAffected = await tx
      .select({ userID: memberships.userID })
      .from(collectionGroupRoles)
      .innerJoin(groupMembers, eq(groupMembers.groupID, collectionGroupRoles.groupID))
      .innerJoin(memberships, eq(memberships.id, groupMembers.membershipID))
      .where(
        and(
          eq(collectionGroupRoles.workspaceID, workspaceID),
          eq(collectionGroupRoles.roleID, roleID)
        )
      );

    await tx
      .update(memberships)
      .set({ roleID: viewerRole.id, updatedAt: new Date() })
      .where(and(eq(memberships.roleID, roleID), eq(memberships.workspaceID, workspaceID)));
    await tx
      .update(invitations)
      .set({ roleID: viewerRole.id })
      .where(and(eq(invitations.roleID, roleID), eq(invitations.workspaceID, workspaceID)));
    await tx
      .update(collectionGroupRoles)
      .set({ roleID: viewerRole.id, updatedAt: new Date() })
      .where(
        and(
          eq(collectionGroupRoles.roleID, roleID),
          eq(collectionGroupRoles.workspaceID, workspaceID)
        )
      );
    await tx
      .update(collectionMemberRoles)
      .set({ roleID: viewerRole.id, updatedAt: new Date() })
      .where(
        and(
          eq(collectionMemberRoles.roleID, roleID),
          eq(collectionMemberRoles.workspaceID, workspaceID)
        )
      );
    await tx.delete(roles).where(and(eq(roles.id, roleID), eq(roles.workspaceID, workspaceID)));

    return [
      ...new Set([...baseAffected, ...directAffected, ...groupAffected].map(({ userID }) => userID))
    ];
  });

  return { affectedUserIDs: affectedUserIDs.map(toUserID) };
};
const deleteRole = withAuthorization<DeleteRoleInput, undefined, { affectedUserIDs: string[] }>(
  { permissions: { session: ["workspace"], key: ["roles"] }, plan: "pro" },
  async ({ input, workspaceID }) => deleteRoleOperation({ ...input, workspaceID })
);

export { deleteRole };
