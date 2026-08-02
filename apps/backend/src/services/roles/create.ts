import { toRoleID, toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { type Permission, roles, type Role } from "#backend/db";
import {
  duplicateRoleNameError,
  isRoleNameUniqueViolation,
  validateRoleName
} from "./validate-name";

const createRole = async (input: {
  workspaceID: string;
  name: string;
  permissions: Permission[];
}): Promise<Role> => {
  const name = await validateRoleName(input);

  try {
    const [role] = await db
      .insert(roles)
      .values({
        workspaceID: toUUID(input.workspaceID),
        name,
        permissions: input.permissions
      })
      .returning();

    return { id: toRoleID(role.id), name: role.name, permissions: role.permissions };
  } catch (error) {
    if (isRoleNameUniqueViolation(error)) throw duplicateRoleNameError();

    throw error;
  }
};

export { createRole };
