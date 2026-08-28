import { toRoleID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { type Permission, roles, type Role } from "#backend/db";
import { withAuthorization } from "#backend/lib/policy";
import {
  duplicateRoleNameError,
  isRoleNameUniqueViolation,
  validateRoleName
} from "#backend/lib/data";

interface CreateRoleInput {
  name: string;
  permissions: Permission[];
}

const createRoleOperation = async (
  input: CreateRoleInput & {
    workspaceID: string;
  }
): Promise<Role> => {
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
const createRole = withAuthorization<CreateRoleInput, undefined, Role>(
  { permissions: { session: ["workspace"], key: ["roles"] }, plan: "pro" },
  async ({ input, workspaceID }) => createRoleOperation({ ...input, workspaceID })
);

export { createRole };
