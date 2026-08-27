import { toUUID, toUserID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import {
  collectionGroupRoles,
  collectionMemberRoles,
  groupMembers,
  memberships,
  type Permission,
  roles
} from "#backend/db";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import {
  duplicateRoleNameError,
  isRoleNameUniqueViolation,
  validateRoleName
} from "#backend/lib/data";

const updateRole = async (input: {
  id: string;
  workspaceID: string;
  name?: string;
  permissions?: Permission[];
}): Promise<{ affectedUserIDs: string[] }> => {
  const roleID = toUUID(input.id);
  const workspaceID = toUUID(input.workspaceID);
  const role = await db.query.roles.findFirst({
    where: and(eq(roles.id, roleID), eq(roles.workspaceID, workspaceID))
  });

  if (!role) throw new ORPCError("NOT_FOUND", { message: "Role not found" });
  if (role.baseRole)
    throw new ORPCError("BAD_REQUEST", { message: "Base roles cannot be modified" });
  if (input.name === undefined && input.permissions === undefined) {
    return { affectedUserIDs: [] };
  }
  const name =
    input.name === undefined
      ? undefined
      : await validateRoleName({
          excludeRoleID: input.id,
          name: input.name,
          workspaceID: input.workspaceID
        });

  try {
    await db
      .update(roles)
      .set({
        ...(name !== undefined && { name }),
        ...(input.permissions !== undefined && { permissions: input.permissions }),
        updatedAt: new Date()
      })
      .where(and(eq(roles.id, roleID), eq(roles.workspaceID, workspaceID)));
  } catch (error) {
    if (isRoleNameUniqueViolation(error)) throw duplicateRoleNameError();

    throw error;
  }

  if (input.permissions !== undefined) {
    const [baseAffected, directAffected, groupAffected] = await Promise.all([
      db
        .select({ userID: memberships.userID })
        .from(memberships)
        .where(and(eq(memberships.roleID, roleID), eq(memberships.workspaceID, workspaceID))),
      db
        .select({ userID: memberships.userID })
        .from(collectionMemberRoles)
        .innerJoin(memberships, eq(memberships.id, collectionMemberRoles.membershipID))
        .where(
          and(
            eq(collectionMemberRoles.workspaceID, workspaceID),
            eq(collectionMemberRoles.roleID, roleID)
          )
        ),
      db
        .select({ userID: memberships.userID })
        .from(collectionGroupRoles)
        .innerJoin(groupMembers, eq(groupMembers.groupID, collectionGroupRoles.groupID))
        .innerJoin(memberships, eq(memberships.id, groupMembers.membershipID))
        .where(
          and(
            eq(collectionGroupRoles.workspaceID, workspaceID),
            eq(collectionGroupRoles.roleID, roleID)
          )
        )
    ]);
    const affectedUserIDs = [
      ...new Set(
        [...baseAffected, ...directAffected, ...groupAffected].map(({ userID }) => toUserID(userID))
      )
    ];

    return { affectedUserIDs };
  }

  return { affectedUserIDs: [] };
};

export { updateRole };
