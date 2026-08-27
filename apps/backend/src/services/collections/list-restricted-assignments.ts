import { collectionGroupRoles, collectionMemberRoles, collections } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { toGroupID, toMembershipID, toRoleID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";

interface RestrictedGroupAssignment {
  groupID: string;
  roleID: string;
}
interface RestrictedMemberAssignment {
  memberID: string;
  roleID: string;
}

const listRestrictedAssignments = async (input: {
  collectionID: string;
  workspaceID: string;
}): Promise<{
  groups: RestrictedGroupAssignment[];
  members: RestrictedMemberAssignment[];
}> => {
  const collectionID = toUUID(input.collectionID);
  const workspaceID = toUUID(input.workspaceID);
  const [collection] = await db
    .select({ restricted: collections.restricted })
    .from(collections)
    .where(
      and(
        eq(collections.id, collectionID),
        eq(collections.workspaceID, workspaceID),
        isNull(collections.deletedAt)
      )
    );

  if (!collection) throw new ORPCError("NOT_FOUND", { message: "Collection not found" });
  if (!collection.restricted) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Access can only be assigned at a restricted collection boundary"
    });
  }

  const [groupRows, memberRows] = await Promise.all([
    db
      .select({ groupID: collectionGroupRoles.groupID, roleID: collectionGroupRoles.roleID })
      .from(collectionGroupRoles)
      .where(
        and(
          eq(collectionGroupRoles.workspaceID, workspaceID),
          eq(collectionGroupRoles.collectionID, collectionID)
        )
      ),
    db
      .select({
        membershipID: collectionMemberRoles.membershipID,
        roleID: collectionMemberRoles.roleID
      })
      .from(collectionMemberRoles)
      .where(
        and(
          eq(collectionMemberRoles.workspaceID, workspaceID),
          eq(collectionMemberRoles.collectionID, collectionID)
        )
      )
  ]);

  return {
    groups: groupRows.map((assignment) => ({
      groupID: toGroupID(assignment.groupID),
      roleID: toRoleID(assignment.roleID)
    })),
    members: memberRows.map((assignment) => ({
      memberID: toMembershipID(assignment.membershipID),
      roleID: toRoleID(assignment.roleID)
    }))
  };
};

export { listRestrictedAssignments };
export type { RestrictedGroupAssignment, RestrictedMemberAssignment };
