import { toRoleID, toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { type Permission, roles, type Role } from "#backend/db";

const createRole = async (input: {
  workspaceID: string;
  name: string;
  permissions: Permission[];
}): Promise<Role> => {
  const [role] = await db
    .insert(roles)
    .values({
      workspaceID: toUUID(input.workspaceID),
      name: input.name,
      permissions: input.permissions
    })
    .returning();

  return { id: toRoleID(role.id), name: role.name, permissions: role.permissions };
};

export { createRole };
