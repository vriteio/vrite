import { invitesDB } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";

const revokeInvite = async (input: { id: string; workspaceID: string }): Promise<void> => {
  const result = await invitesDB.deleteOne({
    _id: toObjectID(input.id),
    workspaceID: toObjectID(input.workspaceID),
    status: "pending"
  });

  if (result.deletedCount === 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Invite not found or already accepted" });
  }
};

export { revokeInvite };
