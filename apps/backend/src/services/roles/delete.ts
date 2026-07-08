import { rolesDB, membershipDB, toUserID } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { Auth } from "#backend/services/auth";
import { ORPCError } from "@orpc/server";

const deleteRole = async (input: { id: string; workspaceID: string }): Promise<void> => {
  const workspaceID = toUUID(input.workspaceID);
  const roleUUID = toUUID(input.id);

  const role = await rolesDB.findOne({ _id: roleUUID, workspaceID });

  if (!role) throw new ORPCError("NOT_FOUND", { message: "Role not found" });
  if (role.baseRole) {
    throw new ORPCError("BAD_REQUEST", { message: "Base roles cannot be deleted" });
  }

  // Collect affected members before reassignment
  const affectedMemberships = await membershipDB
    .find({ roleID: roleUUID, workspaceID })
    .toArray();

  // Find the Viewer role to reassign affected memberships
  const viewerRole = await rolesDB.findOne({
    workspaceID,
    name: "Viewer",
    baseRole: "viewer"
  });

  if (viewerRole) {
    await membershipDB.updateMany(
      { roleID: roleUUID, workspaceID },
      { $set: { roleID: viewerRole._id } }
    );
  }

  await rolesDB.deleteOne({ _id: roleUUID, workspaceID });
  await Promise.all(
    affectedMemberships.map((membership) => {
      return Auth.invalidateSessionData({
        userID: toUserID(membership.userID),
        workspaceID: input.workspaceID
      });
    })
  );
};

export { deleteRole };
