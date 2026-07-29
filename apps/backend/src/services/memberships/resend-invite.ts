import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { invitations, workspaces } from "#backend/db";
import { deliverInvite, type InviteDelivery } from "#backend/lib/invites";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const resendInvite = async (input: {
  id: string;
  workspaceID: string;
}): Promise<InviteDelivery> => {
  const id = toUUID(input.id);
  const workspaceID = toUUID(input.workspaceID);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [workspace] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceID));
  const [invite] = await db
    .update(invitations)
    .set({ expiresAt })
    .where(
      and(
        eq(invitations.id, id),
        eq(invitations.workspaceID, workspaceID),
        eq(invitations.status, "pending")
      )
    )
    .returning();

  if (!invite) {
    throw new ORPCError("BAD_REQUEST", { message: "Invite not found or no longer pending" });
  }
  if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

  const { emailDelivery } = await deliverInvite({ invite, workspaceName: workspace.name });

  return emailDelivery;
};

export { resendInvite };
