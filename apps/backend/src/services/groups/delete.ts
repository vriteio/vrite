import { groupMembers, groups, memberships } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { toUserID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

const deleteGroup = async (input: {
  id: string;
  workspaceID: string;
}): Promise<{ affectedUserIDs: string[] }> => {
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

export { deleteGroup };
