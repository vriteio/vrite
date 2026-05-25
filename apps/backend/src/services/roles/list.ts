import { rolesDB, toRoleID, type Role } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";

const listRoles = async (input: { workspaceID: string }): Promise<Role[]> => {
  const roles = await rolesDB.find({ workspaceID: toObjectID(input.workspaceID) }).toArray();

  return roles.map((role) => ({
    id: toRoleID(role._id),
    name: role.name,
    permissions: role.permissions,
    baseRole: role.baseRole
  }));
};

export { listRoles };
