import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { groupInvitations, invitations } from "#backend/db";
import { withAuthorization } from "#backend/lib/policy";
import { loadGroupMembersUpdates, type GroupMembersUpdate } from "#backend/lib/data";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

interface RevokeInviteInput {
  id: string;
}

const revokeInviteOperation = async (
  input: RevokeInviteInput & { workspaceID: string }
): Promise<{ updatedGroups: GroupMembersUpdate[] }> => {
  const invitationID = toUUID(input.id);
  const workspaceID = toUUID(input.workspaceID);
  const updatedGroups = await db.transaction(async (tx) => {
    const invitationGroups = await tx
      .select({ groupID: groupInvitations.groupID })
      .from(groupInvitations)
      .where(
        and(
          eq(groupInvitations.workspaceID, workspaceID),
          eq(groupInvitations.invitationID, invitationID)
        )
      );
    const deleted = await tx
      .delete(invitations)
      .where(
        and(
          eq(invitations.id, invitationID),
          eq(invitations.workspaceID, workspaceID),
          eq(invitations.status, "pending")
        )
      )
      .returning({ id: invitations.id });

    if (deleted.length === 0) {
      throw new ORPCError("BAD_REQUEST", { message: "Invite not found or already accepted" });
    }

    return loadGroupMembersUpdates(
      tx,
      workspaceID,
      invitationGroups.map(({ groupID }) => groupID)
    );
  });

  return { updatedGroups };
};
const revokeInvite = withAuthorization<
  RevokeInviteInput,
  undefined,
  { updatedGroups: GroupMembersUpdate[] }
>(
  { permissions: { session: ["workspace"], key: ["memberships"] }, plan: "pro" },
  async ({ input, workspaceID }) => revokeInviteOperation({ ...input, workspaceID })
);

export { revokeInvite };
