import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { invitations, workspaces } from "#backend/db";
import { deliverInvite, type InviteDelivery } from "#backend/lib/messaging";
import { withAuthorization } from "#backend/lib/policy";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

interface ResendInviteInput {
  id: string;
}

const resendInviteOperation = async (
  input: ResendInviteInput & { workspaceID: string }
): Promise<{ emailDelivery: InviteDelivery }> => {
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

  return { emailDelivery };
};
const resendInvite = withAuthorization<
  ResendInviteInput,
  undefined,
  { emailDelivery: InviteDelivery }
>(
  { permissions: { session: ["workspace"], key: ["memberships"] }, plan: "pro" },
  async ({ input, workspaceID }) => resendInviteOperation({ ...input, workspaceID })
);

export { resendInvite };
