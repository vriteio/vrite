import { toUUID } from "#backend/lib/primitives";
import { auth, db } from "#backend/lib/adapters";
import { memberships } from "#backend/db";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const switchWorkspace = async (input: {
  headers: Headers;
  workspaceID: string;
  userID: string;
}) => {
  const userID = toUUID(input.userID);
  const workspaceID = toUUID(input.workspaceID);
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userID, userID), eq(memberships.workspaceID, workspaceID))
  });

  if (!membership) {
    throw new ORPCError("FORBIDDEN", { message: "You are not a member of this workspace" });
  }

  await auth.api.updateUser({
    headers: input.headers,
    body: {
      currentWorkspaceID: input.workspaceID
    }
  });
};

export { switchWorkspace };
