import { membershipDB, rolesDB, toUserID } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";
import { Auth } from "#backend/services/auth";

const updateMember = async (input: {
  id: string;
  workspaceID: string;
  roleID: string;
}): Promise<void> => {
  const workspaceID = toObjectID(input.workspaceID);
  const memberOID = toObjectID(input.id);

  const membership = await membershipDB.findOne({ _id: memberOID, workspaceID });

  if (!membership) throw new ORPCError("NOT_FOUND", { message: "Membership not found" });

  const existingMembershipRole = await rolesDB.findOne({
    _id: toObjectID(membership.roleID),
    workspaceID
  });
  const newMembershipRole = await rolesDB.findOne({
    _id: toObjectID(input.roleID),
    workspaceID
  });

  if (!newMembershipRole) throw new ORPCError("BAD_REQUEST", { message: "Role not found" });

  // Make sure at least one admin remains
  if (newMembershipRole.baseRole !== "admin" && existingMembershipRole?.baseRole === "admin") {
    const adminRoleID = existingMembershipRole._id;
    const adminCount = await membershipDB.countDocuments({ roleID: adminRoleID, workspaceID });

    if (adminCount <= 1) {
      throw new ORPCError("BAD_REQUEST", {
        message: "At least one admin is required in the workspace"
      });
    }
  }

  await membershipDB.updateOne(
    { _id: memberOID, workspaceID },
    {
      $set: {
        roleID: newMembershipRole._id
      }
    }
  );

  await Auth.invalidateSessionData({
    userID: toUserID(membership.userID),
    workspaceID: input.workspaceID
  });
};

export { updateMember };
