import { collectionGroupRoles, collectionMemberRoles, collections } from "#backend/db";
import { toGroupID, toMembershipID, toRoleID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { withAuthorization } from "#backend/lib/policy";

interface RestrictedGroupAssignment {
  groupID: string;
  roleID: string;
}
interface RestrictedMemberAssignment {
  memberID: string;
  roleID: string;
}

interface ListRestrictedAssignmentsInput {
  collectionID: string;
}
interface RestrictedAssignments {
  groups: RestrictedGroupAssignment[];
  members: RestrictedMemberAssignment[];
}

const listRestrictedAssignments = withAuthorization<
  ListRestrictedAssignmentsInput,
  undefined,
  RestrictedAssignments
>(
  {
    actions: ({ input }) => ({
      collections: [
        {
          action: "collection:manage-restricted-access",
          collectionID: input.collectionID
        }
      ]
    }),
    plan: "pro"
  },
  async ({ database, input, workspaceID }) => {
    const collectionID = toUUID(input.collectionID);
    const [collection] = await database
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
      database
        .select({ groupID: collectionGroupRoles.groupID, roleID: collectionGroupRoles.roleID })
        .from(collectionGroupRoles)
        .where(
          and(
            eq(collectionGroupRoles.workspaceID, workspaceID),
            eq(collectionGroupRoles.collectionID, collectionID)
          )
        ),
      database
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
  }
);

export { listRestrictedAssignments };
export type { RestrictedGroupAssignment, RestrictedMemberAssignment };
