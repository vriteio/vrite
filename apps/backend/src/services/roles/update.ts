import { rolesDB, membershipDB, toUserID, type Permission } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { Auth } from "#backend/services/auth";
import { ORPCError } from "@orpc/server";

const updateRole = async (input: {
  id: string;
  workspaceID: string;
  name?: string;
  permissions?: Permission[];
}): Promise<void> => {
  const role = await rolesDB.findOne({
    _id: toUUID(input.id),
    workspaceID: toUUID(input.workspaceID)
  });

  if (!role) throw new ORPCError("NOT_FOUND", { message: "Role not found" });
  if (role.baseRole) {
    throw new ORPCError("BAD_REQUEST", { message: "Base roles cannot be modified" });
  }

  const update: Record<string, any> = {};

  if (input.name !== undefined) update.name = input.name;
  if (input.permissions !== undefined) update.permissions = input.permissions;

  if (Object.keys(update).length === 0) return;

  await rolesDB.updateOne(
    { _id: toUUID(input.id), workspaceID: toUUID(input.workspaceID) },
    { $set: update }
  );

  if (input.permissions !== undefined) {
    const memberships = await membershipDB
      .find({ roleID: toUUID(input.id), workspaceID: toUUID(input.workspaceID) })
      .toArray();

    await Promise.all(
      memberships.map((membership) => {
        return Auth.invalidateSessionData({
          userID: toUserID(membership.userID),
          workspaceID: input.workspaceID
        });
      })
    );
  }
};

export { updateRole };
