import { membershipDB, rolesDB, workspacesDB, usersDB } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";
import { Auth } from "#backend/services/auth";

const deleteWorkspace = async (input: { workspaceID: string; userID: string }) => {
  const workspaceUUID = toUUID(input.workspaceID);

  // Ensure the user has at least one other workspace
  const memberCount = await membershipDB.countDocuments({
    userID: toUUID(input.userID)
  });

  if (memberCount <= 1) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Cannot delete your only workspace"
    });
  }

  // Invalidate all cached sessions for this workspace before deletion
  await Auth.invalidateSessionData({ workspaceID: input.workspaceID });

  // Remove workspace and all associated data
  await Promise.all([
    workspacesDB.deleteOne({ _id: workspaceUUID }),
    membershipDB.deleteMany({ workspaceID: workspaceUUID }),
    rolesDB.deleteMany({ workspaceID: workspaceUUID })
  ]);

  // If the user's currentWorkspaceID pointed to the deleted workspace, clear it
  const user = await usersDB.findOne({ _id: toUUID(input.userID) });

  if (user && user.currentWorkspaceID && user.currentWorkspaceID.equals(workspaceUUID)) {
    // Set to another workspace the user is a member of
    const anotherMembership = await membershipDB.findOne({
      userID: toUUID(input.userID)
    });

    await usersDB.updateOne(
      { _id: toUUID(input.userID) },
      { $set: { currentWorkspaceID: anotherMembership?.workspaceID } }
    );
  }
};

export { deleteWorkspace };
