import { groupInvitations, groupMembers, invitations } from "#backend/db";
import type { db } from "#backend/lib/adapters";
import { toGroupID, toInviteID, toMembershipID } from "#backend/lib/primitives";
import { and, eq, gt, inArray } from "drizzle-orm";

interface GroupMembersUpdate {
  id: string;
  invitationIDs: string[];
  memberIDs: string[];
}

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const loadGroupMembersUpdates = async (
  database: DatabaseTransaction,
  workspaceID: string,
  groupIDs: string[]
): Promise<GroupMembersUpdate[]> => {
  if (groupIDs.length === 0) return [];

  const uniqueGroupIDs = [...new Set(groupIDs)];
  const [memberRows, invitationRows] = await Promise.all([
    database
      .select({ groupID: groupMembers.groupID, membershipID: groupMembers.membershipID })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.workspaceID, workspaceID),
          inArray(groupMembers.groupID, uniqueGroupIDs)
        )
      ),
    database
      .select({
        groupID: groupInvitations.groupID,
        invitationID: groupInvitations.invitationID
      })
      .from(groupInvitations)
      .innerJoin(invitations, eq(invitations.id, groupInvitations.invitationID))
      .where(
        and(
          eq(groupInvitations.workspaceID, workspaceID),
          inArray(groupInvitations.groupID, uniqueGroupIDs),
          eq(invitations.status, "pending"),
          gt(invitations.expiresAt, new Date())
        )
      )
  ]);
  const memberIDsByGroupID = new Map<string, string[]>();
  const invitationIDsByGroupID = new Map<string, string[]>();

  for (const member of memberRows) {
    const memberIDs = memberIDsByGroupID.get(member.groupID) || [];

    memberIDs.push(toMembershipID(member.membershipID));
    memberIDsByGroupID.set(member.groupID, memberIDs);
  }

  for (const invitation of invitationRows) {
    const invitationIDs = invitationIDsByGroupID.get(invitation.groupID) || [];

    invitationIDs.push(toInviteID(invitation.invitationID));
    invitationIDsByGroupID.set(invitation.groupID, invitationIDs);
  }

  return uniqueGroupIDs.map((groupID) => ({
    id: toGroupID(groupID),
    invitationIDs: invitationIDsByGroupID.get(groupID) || [],
    memberIDs: memberIDsByGroupID.get(groupID) || []
  }));
};

export { loadGroupMembersUpdates };
export type { GroupMembersUpdate };
