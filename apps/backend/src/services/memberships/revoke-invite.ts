import { toGroupID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { groupInvitations, invitations } from "#backend/db";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const revokeInvite = async (input: {
  id: string;
  workspaceID: string;
}): Promise<{ groupIDs: string[] }> => {
  const invitationID = toUUID(input.id);
  const workspaceID = toUUID(input.workspaceID);
  const groupIDs = await db.transaction(async (tx) => {
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

    return invitationGroups.map(({ groupID }) => toGroupID(groupID));
  });

  return { groupIDs };
};

export { revokeInvite };
