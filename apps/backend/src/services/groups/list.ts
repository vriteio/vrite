import { groupInvitations, groupMembers, groups, type Group, invitations } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { withAuthorization } from "#backend/lib/policy";
import { toGroupID, toInviteID, toMembershipID, toUUID } from "#backend/lib/primitives";
import { and, asc, eq, gt } from "drizzle-orm";

interface GroupDetails extends Group {
  invitationIDs: string[];
  memberIDs: string[];
}

const listGroupsOperation = async (input: {
  workspaceID: string;
}): Promise<{ groups: GroupDetails[] }> => {
  const workspaceID = toUUID(input.workspaceID);
  const [groupRows, memberRows, invitationRows] = await Promise.all([
    db.select().from(groups).where(eq(groups.workspaceID, workspaceID)).orderBy(asc(groups.name)),
    db.select().from(groupMembers).where(eq(groupMembers.workspaceID, workspaceID)),
    db
      .select({
        groupID: groupInvitations.groupID,
        invitationID: groupInvitations.invitationID
      })
      .from(groupInvitations)
      .innerJoin(invitations, eq(invitations.id, groupInvitations.invitationID))
      .where(
        and(
          eq(groupInvitations.workspaceID, workspaceID),
          eq(invitations.status, "pending"),
          gt(invitations.expiresAt, new Date())
        )
      )
  ]);
  const memberIDsByGroupID = new Map<string, string[]>();
  const invitationIDsByGroupID = new Map<string, string[]>();

  for (const member of memberRows) {
    memberIDsByGroupID.set(member.groupID, [
      ...(memberIDsByGroupID.get(member.groupID) || []),
      toMembershipID(member.membershipID)
    ]);
  }

  for (const invitation of invitationRows) {
    invitationIDsByGroupID.set(invitation.groupID, [
      ...(invitationIDsByGroupID.get(invitation.groupID) || []),
      toInviteID(invitation.invitationID)
    ]);
  }

  return {
    groups: groupRows.map((group) => ({
      id: toGroupID(group.id),
      name: group.name,
      memberIDs: memberIDsByGroupID.get(group.id) || [],
      invitationIDs: invitationIDsByGroupID.get(group.id) || []
    }))
  };
};
const listGroups = withAuthorization<Record<never, never>, undefined, { groups: GroupDetails[] }>(
  { permissions: { session: ["workspace"] }, plan: "pro" },
  async ({ workspaceID }) => listGroupsOperation({ workspaceID })
);
export { listGroups };
export type { GroupDetails };
