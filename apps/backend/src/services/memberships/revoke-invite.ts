import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { invitations } from "#backend/db";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const revokeInvite = async (input: { id: string; workspaceID: string }): Promise<void> => {
  const deleted = await db
    .delete(invitations)
    .where(
      and(
        eq(invitations.id, toUUID(input.id)),
        eq(invitations.workspaceID, toUUID(input.workspaceID)),
        eq(invitations.status, "pending")
      )
    )
    .returning({ id: invitations.id });

  if (deleted.length === 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Invite not found or already accepted" });
  }
};

export { revokeInvite };
