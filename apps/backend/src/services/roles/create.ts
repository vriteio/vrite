import { rolesDB, toRoleID, type Role, type Permission } from "#backend/db";
import { generateUUID, toUUID, type UnderscoreID } from "#backend/lib/mongo";
import { type FullRole } from "#backend/db";
import type { UUID } from "#backend/lib/mongo";

const createRole = async (input: {
  workspaceID: string;
  name: string;
  permissions: Permission[];
}): Promise<Role> => {
  const role: UnderscoreID<FullRole<UUID>> = {
    _id: generateUUID(),
    workspaceID: toUUID(input.workspaceID),
    name: input.name,
    permissions: input.permissions
  };

  await rolesDB.insertOne(role);

  return {
    id: toRoleID(role._id),
    name: role.name,
    permissions: role.permissions
  };
};

export { createRole };
