import { groupMembers, groups, memberships } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { withAuthorization } from "#backend/lib/policy";
import { toUserID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

interface DeleteGroupInput {
  id: string;
}

const deleteGroupOperation = async (
  input: DeleteGroupInput & { workspaceID: string }
): Promise<{ affectedUserIDs: string[] }> => {
  const groupID = toUUID(input.id);
  const workspaceID = toUUID(input.workspaceID);
  const affectedUserIDs = await db.transaction(async (tx) => {
    const [group] = await tx
      .select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.id, groupID), eq(groups.workspaceID, workspaceID)))
      .for("update");

    if (!group) throw new ORPCError("NOT_FOUND", { message: "Group not found" });

    const members = await tx
      .select({ userID: memberships.userID })
      .from(groupMembers)
      .innerJoin(memberships, eq(memberships.id, groupMembers.membershipID))
      .where(and(eq(groupMembers.groupID, groupID), eq(groupMembers.workspaceID, workspaceID)));

    await tx.delete(groups).where(and(eq(groups.id, groupID), eq(groups.workspaceID, workspaceID)));

    return members.map(({ userID }) => toUserID(userID));
  });

  return { affectedUserIDs };
};
const deleteGroup = withAuthorization<DeleteGroupInput, undefined, { affectedUserIDs: string[] }>(
  { permissions: { session: ["workspace"] }, plan: "pro" },
  async ({ input, workspaceID }) => deleteGroupOperation({ ...input, workspaceID })
);

export { deleteGroup };
