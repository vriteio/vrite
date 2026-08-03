import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { memberships, users } from "#backend/db";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const switchWorkspace = async (input: { workspaceID: string; userID: string }) => {
  const userID = toUUID(input.userID);
  const workspaceID = toUUID(input.workspaceID);
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userID, userID), eq(memberships.workspaceID, workspaceID))
  });

  if (!membership) {
    throw new ORPCError("FORBIDDEN", { message: "You are not a member of this workspace" });
  }

  await db
    .update(users)
    .set({ currentWorkspaceID: workspaceID, updatedAt: new Date() })
    .where(eq(users.id, userID));
};

export { switchWorkspace };
