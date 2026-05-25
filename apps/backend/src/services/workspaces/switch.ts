import { membershipDB, usersDB } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";

const switchWorkspace = async (input: { workspaceID: string; userID: string }) => {
  // Verify the user has a membership in the target workspace
  const membership = await membershipDB.findOne({
    userID: toObjectID(input.userID),
    workspaceID: toObjectID(input.workspaceID)
  });

  if (!membership) {
    throw new ORPCError("FORBIDDEN", {
      message: "You are not a member of this workspace"
    });
  }

  await usersDB.updateOne(
    { _id: toObjectID(input.userID) },
    { $set: { currentWorkspaceID: toObjectID(input.workspaceID) } }
  );
};

export { switchWorkspace };
