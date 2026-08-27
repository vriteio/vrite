import {
  collectionGroupRoles,
  collectionMemberRoles,
  collections,
  groupMembers,
  groups,
  memberships,
  roles
} from "#backend/db";
import { db } from "#backend/lib/adapters";
import { toUserID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type {
  RestrictedGroupAssignment,
  RestrictedMemberAssignment
} from "./list-restricted-assignments";

const setRestrictedAssignments = async (input: {
  collectionID: string;
  groups: RestrictedGroupAssignment[];
  members: RestrictedMemberAssignment[];
  workspaceID: string;
}): Promise<{ affectedUserIDs: string[] }> => {
  const collectionID = toUUID(input.collectionID);
  const groupAssignments = new Map(
    input.groups.map((assignment) => [toUUID(assignment.groupID), toUUID(assignment.roleID)])
  );
  const memberAssignments = new Map(
    input.members.map((assignment) => [toUUID(assignment.memberID), toUUID(assignment.roleID)])
  );
  const roleIDs = [...new Set([...groupAssignments.values(), ...memberAssignments.values()])];
  const workspaceID = toUUID(input.workspaceID);
  const affectedUserIDs = await db.transaction(async (tx) => {
    const [collection] = await tx
      .select({ restricted: collections.restricted })
      .from(collections)
      .where(
        and(
          eq(collections.id, collectionID),
          eq(collections.workspaceID, workspaceID),
          isNull(collections.deletedAt)
        )
      )
      .for("update");

    if (!collection) throw new ORPCError("NOT_FOUND", { message: "Collection not found" });
    if (!collection.restricted) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Access can only be assigned at a restricted collection boundary"
      });
    }

    const groupIDs = [...groupAssignments.keys()];
    const memberIDs = [...memberAssignments.keys()];
    const [roleRows, groupRows, memberRows, previousDirectUsers, previousGroupUsers] =
      await Promise.all([
        roleIDs.length > 0
          ? tx
              .select({ id: roles.id, baseRole: roles.baseRole })
              .from(roles)
              .where(and(eq(roles.workspaceID, workspaceID), inArray(roles.id, roleIDs)))
          : [],
        groupIDs.length > 0
          ? tx
              .select({ id: groups.id })
              .from(groups)
              .where(and(eq(groups.workspaceID, workspaceID), inArray(groups.id, groupIDs)))
          : [],
        memberIDs.length > 0
          ? tx
              .select({ id: memberships.id, userID: memberships.userID })
              .from(memberships)
              .where(
                and(eq(memberships.workspaceID, workspaceID), inArray(memberships.id, memberIDs))
              )
          : [],
        tx
          .select({ userID: memberships.userID })
          .from(collectionMemberRoles)
          .innerJoin(memberships, eq(memberships.id, collectionMemberRoles.membershipID))
          .where(
            and(
              eq(collectionMemberRoles.workspaceID, workspaceID),
              eq(collectionMemberRoles.collectionID, collectionID)
            )
          ),
        tx
          .select({ userID: memberships.userID })
          .from(collectionGroupRoles)
          .innerJoin(groupMembers, eq(groupMembers.groupID, collectionGroupRoles.groupID))
          .innerJoin(memberships, eq(memberships.id, groupMembers.membershipID))
          .where(
            and(
              eq(collectionGroupRoles.workspaceID, workspaceID),
              eq(collectionGroupRoles.collectionID, collectionID)
            )
          )
      ]);

    if (roleRows.length !== roleIDs.length) {
      throw new ORPCError("BAD_REQUEST", { message: "One or more roles could not be found" });
    }

    if (roleRows.some((role) => role.baseRole === "admin")) {
      throw new ORPCError("BAD_REQUEST", {
        message: "The Admin role cannot be assigned to restricted collections"
      });
    }

    if (groupRows.length !== groupIDs.length) {
      throw new ORPCError("BAD_REQUEST", { message: "One or more groups could not be found" });
    }

    if (memberRows.length !== memberIDs.length) {
      throw new ORPCError("BAD_REQUEST", { message: "One or more members could not be found" });
    }

    await tx
      .delete(collectionGroupRoles)
      .where(
        and(
          eq(collectionGroupRoles.workspaceID, workspaceID),
          eq(collectionGroupRoles.collectionID, collectionID)
        )
      );
    await tx
      .delete(collectionMemberRoles)
      .where(
        and(
          eq(collectionMemberRoles.workspaceID, workspaceID),
          eq(collectionMemberRoles.collectionID, collectionID)
        )
      );

    if (groupAssignments.size > 0) {
      await tx.insert(collectionGroupRoles).values(
        [...groupAssignments].map(([groupID, roleID]) => ({
          collectionID,
          groupID,
          roleID,
          workspaceID
        }))
      );
    }

    if (memberAssignments.size > 0) {
      await tx.insert(collectionMemberRoles).values(
        [...memberAssignments].map(([membershipID, roleID]) => ({
          collectionID,
          membershipID,
          roleID,
          workspaceID
        }))
      );
    }

    const newGroupUsers =
      groupIDs.length > 0
        ? await tx
            .select({ userID: memberships.userID })
            .from(groupMembers)
            .innerJoin(memberships, eq(memberships.id, groupMembers.membershipID))
            .where(
              and(
                eq(groupMembers.workspaceID, workspaceID),
                inArray(groupMembers.groupID, groupIDs)
              )
            )
        : [];

    return [
      ...new Set(
        [...previousDirectUsers, ...previousGroupUsers, ...memberRows, ...newGroupUsers].map(
          ({ userID }) => toUserID(userID)
        )
      )
    ];
  });

  return { affectedUserIDs };
};

export { setRestrictedAssignments };
