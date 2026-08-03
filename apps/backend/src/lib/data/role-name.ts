import { roles } from "#backend/db";
import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { and, eq, ne, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const duplicateRoleNameError = () => {
  return new ORPCError("ROLE_NAME_DUPLICATE", {
    status: 409,
    message: "A role with this name already exists"
  });
};
const normalizeRoleName = (name: string): string => {
  const normalizedName = name.trim();

  if (!normalizedName || normalizedName.length > 50) {
    throw new ORPCError("ROLE_NAME_INVALID", {
      status: 400,
      message: "Role names must be between 1 and 50 characters"
    });
  }

  return normalizedName;
};
const validateRoleName = async (input: {
  excludeRoleID?: string;
  name: string;
  workspaceID: string;
}): Promise<string> => {
  const name = normalizeRoleName(input.name);
  const filters = [
    eq(roles.workspaceID, toUUID(input.workspaceID)),
    sql`lower(${roles.name}) = lower(${name})`
  ];

  if (input.excludeRoleID) filters.push(ne(roles.id, toUUID(input.excludeRoleID)));

  const [existingRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(...filters))
    .limit(1);

  if (existingRole) throw duplicateRoleNameError();

  return name;
};
const isRoleNameUniqueViolation = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;

  const databaseError = error as { code?: unknown; constraint?: unknown };

  return (
    databaseError.code === "23505" && databaseError.constraint === "roles_workspace_name_unique"
  );
};

export { duplicateRoleNameError, isRoleNameUniqueViolation, validateRoleName };
