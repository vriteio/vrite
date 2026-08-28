import { toRoleID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { roles, type Role } from "#backend/db";
import { withAuthorization } from "#backend/lib/policy";
import { eq } from "drizzle-orm";

const listRolesOperation = async (input: { workspaceID: string }): Promise<{ roles: Role[] }> => {
  const rows = await db
    .select()
    .from(roles)
    .where(eq(roles.workspaceID, toUUID(input.workspaceID)));

  return {
    roles: rows.map((role) => ({
      id: toRoleID(role.id),
      name: role.name,
      permissions: role.permissions,
      ...(role.baseRole && { baseRole: role.baseRole })
    }))
  };
};
const listRoles = withAuthorization<Record<never, never>, undefined, { roles: Role[] }>(
  { permissions: { session: ["workspace"], key: ["read:roles"] } },
  async ({ workspaceID }) => listRolesOperation({ workspaceID })
);

export { listRoles };
