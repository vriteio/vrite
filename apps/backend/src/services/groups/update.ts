import {
  groupInvitations,
  groupMembers,
  groups,
  invitations,
  memberships,
  workspaces
} from "#backend/db";
import { db } from "#backend/lib/adapters";
import {
  duplicateGroupNameError,
  isGroupNameUniqueViolation,
  validateGroupName
} from "#backend/lib/data";
import { withAuthorization } from "#backend/lib/policy";
import {
  toGroupID,
  toInviteID,
  toMembershipID,
  toUserID,
  toUUID,
  toWorkspaceID
} from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, gt, inArray } from "drizzle-orm";

interface SaveGroupInput {
  invitationIDs: string[];
  memberIDs: string[];
  name: string;
  workspaceID: string;
  id?: string;
}

interface SaveGroupResult {
  affectedUserIDs: string[];
  id: string;
  invitationIDs: string[];
  memberIDs: string[];
  name: string;
}

type UpdateGroupInput = Omit<SaveGroupInput, "workspaceID"> & { id: string };

const saveGroup = async (input: SaveGroupInput): Promise<SaveGroupResult> => {
  const invitationIDs = [...new Set(input.invitationIDs)].map(toUUID);
  const memberIDs = [...new Set(input.memberIDs)].map(toUUID);
  const workspaceID = toUUID(input.workspaceID);
  const name = await validateGroupName({
    excludeGroupID: input.id,
    name: input.name,
    workspaceID: input.workspaceID
  });

  try {
    return await db.transaction(async (tx) => {
      await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceID))
        .for("update");

      let groupID = input.id ? toUUID(input.id) : null;
      let existingMembers: Array<{ userID: string }> = [];

      if (groupID) {
        const updated = await tx
          .update(groups)
          .set({ name, updatedAt: new Date() })
          .where(and(eq(groups.id, groupID), eq(groups.workspaceID, workspaceID)))
          .returning({ id: groups.id });

        if (updated.length === 0) {
          throw new ORPCError("NOT_FOUND", { message: "Group not found" });
        }

        existingMembers = await tx
          .select({ userID: memberships.userID })
          .from(groupMembers)
          .innerJoin(memberships, eq(memberships.id, groupMembers.membershipID))
          .where(and(eq(groupMembers.groupID, groupID), eq(groupMembers.workspaceID, workspaceID)));
      } else {
        const [created] = await tx
          .insert(groups)
          .values({ name, workspaceID })
          .returning({ id: groups.id });

        groupID = created.id;
      }

      const memberRows =
        memberIDs.length > 0
          ? await tx
              .select({ id: memberships.id, userID: memberships.userID })
              .from(memberships)
              .where(
                and(eq(memberships.workspaceID, workspaceID), inArray(memberships.id, memberIDs))
              )
              .for("update")
          : [];
      const invitationRows =
        invitationIDs.length > 0
          ? await tx
              .select({ id: invitations.id })
              .from(invitations)
              .where(
                and(
                  eq(invitations.workspaceID, workspaceID),
                  eq(invitations.status, "pending"),
                  gt(invitations.expiresAt, new Date()),
                  inArray(invitations.id, invitationIDs)
                )
              )
              .for("update")
          : [];

      if (memberRows.length !== memberIDs.length) {
        throw new ORPCError("BAD_REQUEST", { message: "One or more members could not be found" });
      }

      if (invitationRows.length !== invitationIDs.length) {
        throw new ORPCError("BAD_REQUEST", {
          message: "One or more pending invitations could not be found"
        });
      }

      await tx.delete(groupMembers).where(eq(groupMembers.groupID, groupID));
      await tx.delete(groupInvitations).where(eq(groupInvitations.groupID, groupID));

      if (memberRows.length > 0) {
        await tx.insert(groupMembers).values(
          memberRows.map((member) => ({
            groupID,
            membershipID: member.id,
            workspaceID
          }))
        );
      }

      if (invitationRows.length > 0) {
        await tx.insert(groupInvitations).values(
          invitationRows.map((invitation) => ({
            groupID,
            invitationID: invitation.id,
            workspaceID
          }))
        );
      }

      return {
        affectedUserIDs: [
          ...new Set([...existingMembers, ...memberRows].map(({ userID }) => toUserID(userID)))
        ],
        id: toGroupID(groupID),
        invitationIDs: invitationIDs.map(toInviteID),
        memberIDs: memberIDs.map(toMembershipID),
        name
      };
    });
  } catch (error) {
    if (isGroupNameUniqueViolation(error)) throw duplicateGroupNameError();

    throw error;
  }
};

const updateGroupOperation = async (
  input: SaveGroupInput & { id: string }
): Promise<SaveGroupResult> => {
  return saveGroup(input);
};
const updateGroup = withAuthorization<UpdateGroupInput, undefined, SaveGroupResult>(
  { permissions: { session: ["workspace"] }, plan: "pro" },
  async ({ input, workspaceID }) => {
    return updateGroupOperation({ ...input, workspaceID: toWorkspaceID(workspaceID) });
  }
);

export { saveGroup, updateGroup };
export type { SaveGroupInput, SaveGroupResult };
