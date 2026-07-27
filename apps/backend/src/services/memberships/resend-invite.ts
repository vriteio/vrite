import { invitesDB, workspacesDB } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";
import { deliverInvite, type InviteDelivery } from "#backend/lib/invites";

const resendInvite = async (input: {
  id: string;
  workspaceID: string;
}): Promise<InviteDelivery> => {
  const id = toUUID(input.id);
  const workspaceID = toUUID(input.workspaceID);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d
  const [invite, workspace] = await Promise.all([
    invitesDB.findOne({ _id: id, workspaceID, status: "pending" }),
    workspacesDB.findOne({ _id: workspaceID })
  ]);

  if (!invite) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Invite not found or no longer pending"
    });
  }

  if (!workspace) {
    throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
  }

  await invitesDB.updateOne({ _id: id }, { $set: { expiresAt } });

  const { emailDelivery } = await deliverInvite({
    invite: { ...invite, expiresAt },
    workspaceName: workspace.name
  });

  return emailDelivery;
};

export { resendInvite };
