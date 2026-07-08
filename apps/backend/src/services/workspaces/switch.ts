import { membershipDB, usersDB } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";

const switchWorkspace = async (input: { workspaceID: string; userID: string }) => {
  // Verify the user has a membership in the target workspace
  const membership = await membershipDB.findOne({
    userID: toUUID(input.userID),
    workspaceID: toUUID(input.workspaceID)
  });

  if (!membership) {
    throw new ORPCError("FORBIDDEN", {
      message: "You are not a member of this workspace"
    });
  }

  await usersDB.updateOne(
    { _id: toUUID(input.userID) },
    { $set: { currentWorkspaceID: toUUID(input.workspaceID) } }
  );
};

export { switchWorkspace };
