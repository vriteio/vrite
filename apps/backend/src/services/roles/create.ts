import { rolesDB, toRoleID, type Role, type Permission } from "#backend/db";
import { toObjectID, type UnderscoreID } from "#backend/lib/mongo";
import { type FullRole } from "#backend/db";
import { ObjectId } from "mongodb";

const createRole = async (input: {
  workspaceID: string;
  name: string;
  permissions: Permission[];
}): Promise<Role> => {
  const role: UnderscoreID<FullRole<ObjectId>> = {
    _id: new ObjectId(),
    workspaceID: toObjectID(input.workspaceID),
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
