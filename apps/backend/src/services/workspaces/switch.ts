import { toUUID } from "#backend/lib/primitives";
import { auth, db } from "#backend/lib/adapters";
import { memberships, roles, workspaces } from "#backend/db";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const switchWorkspace = async (input: {
  headers: Headers;
  workspaceID: string;
  userID: string;
}) => {
  const userID = toUUID(input.userID);
  const workspaceID = toUUID(input.workspaceID);
  const [membership] = await db
    .select({ baseRole: roles.baseRole, subscriptionPlan: workspaces.subscriptionPlan })
    .from(memberships)
    .innerJoin(roles, eq(roles.id, memberships.roleID))
    .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceID))
    .where(and(eq(memberships.userID, userID), eq(memberships.workspaceID, workspaceID)));

  if (!membership) {
    throw new ORPCError("FORBIDDEN", { message: "You are not a member of this workspace" });
  }

  if (membership.baseRole !== "admin" && membership.subscriptionPlan !== "pro") {
    throw new ORPCError("FORBIDDEN", {
      message: "This workspace is only available to admins while it is on the Free plan"
    });
  }

  await auth.api.updateUser({
    headers: input.headers,
    body: {
      currentWorkspaceID: input.workspaceID
    }
  });
};

export { switchWorkspace };
