import { membershipDB, rolesDB, toUserID } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { Auth } from "#backend/services/auth";
import { ORPCError } from "@orpc/server";

const removeMember = async (input: { id: string; workspaceID: string }): Promise<void> => {
  const workspaceID = toUUID(input.workspaceID);
  const memberUUID = toUUID(input.id);

  const membership = await membershipDB.findOne({ _id: memberUUID, workspaceID });

  if (!membership) throw new ORPCError("NOT_FOUND", { message: "Membership not found" });

  const role = await rolesDB.findOne({ _id: toUUID(membership.roleID), workspaceID });

  if (!role) throw new ORPCError("NOT_FOUND", { message: "Role not found" });

  // Prevent removing the last admin
  if (role.baseRole === "admin") {
    const adminCount = await membershipDB.countDocuments({
      workspaceID,
      roleID: role._id
    });

    if (adminCount <= 1) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Cannot remove the last admin from the workspace"
      });
    }
  }

  await membershipDB.deleteOne({ _id: memberUUID, workspaceID });

  await Auth.invalidateSessionData({
    userID: toUserID(membership.userID),
    workspaceID: input.workspaceID
  });
};

export { removeMember };
