import { groups } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, ne, sql } from "drizzle-orm";

const duplicateGroupNameError = () => {
  return new ORPCError("GROUP_NAME_DUPLICATE", {
    status: 409,
    message: "A group with this name already exists"
  });
};
const normalizeGroupName = (name: string): string => {
  const normalizedName = name.trim();

  if (!normalizedName || normalizedName.length > 50) {
    throw new ORPCError("GROUP_NAME_INVALID", {
      status: 400,
      message: "Group names must be between 1 and 50 characters"
    });
  }

  return normalizedName;
};
const validateGroupName = async (input: {
  excludeGroupID?: string;
  name: string;
  workspaceID: string;
}): Promise<string> => {
  const name = normalizeGroupName(input.name);
  const filters = [
    eq(groups.workspaceID, toUUID(input.workspaceID)),
    sql`lower(${groups.name}) = lower(${name})`
  ];

  if (input.excludeGroupID) filters.push(ne(groups.id, toUUID(input.excludeGroupID)));

  const [existingGroup] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(...filters))
    .limit(1);

  if (existingGroup) throw duplicateGroupNameError();

  return name;
};
const isGroupNameUniqueViolation = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;

  const databaseError = error as { code?: unknown; constraint?: unknown };

  return (
    databaseError.code === "23505" && databaseError.constraint === "groups_workspace_name_unique"
  );
};

export { duplicateGroupNameError, isGroupNameUniqueViolation, validateGroupName };
