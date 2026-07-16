import { rolesDB, toRoleID, type Role } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";

const listRoles = async (input: { workspaceID: string }): Promise<Role[]> => {
  const roles = await rolesDB.find({ workspaceID: toUUID(input.workspaceID) }).toArray();

  return roles.map((role) => ({
    id: toRoleID(role._id),
    name: role.name,
    permissions: role.permissions,
    ...(role.baseRole && { baseRole: role.baseRole })
  }));
};

export { listRoles };
