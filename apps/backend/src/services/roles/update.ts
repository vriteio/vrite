import { toUUID, toUserID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { memberships, type Permission, roles } from "#backend/db";
import { Auth } from "#backend/services/auth";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const updateRole = async (input: {
  id: string;
  workspaceID: string;
  name?: string;
  permissions?: Permission[];
}): Promise<void> => {
  const roleID = toUUID(input.id);
  const workspaceID = toUUID(input.workspaceID);
  const role = await db.query.roles.findFirst({
    where: and(eq(roles.id, roleID), eq(roles.workspaceID, workspaceID))
  });

  if (!role) throw new ORPCError("NOT_FOUND", { message: "Role not found" });
  if (role.baseRole)
    throw new ORPCError("BAD_REQUEST", { message: "Base roles cannot be modified" });
  if (input.name === undefined && input.permissions === undefined) return;

  await db
    .update(roles)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.permissions !== undefined && { permissions: input.permissions }),
      updatedAt: new Date()
    })
    .where(and(eq(roles.id, roleID), eq(roles.workspaceID, workspaceID)));

  if (input.permissions !== undefined) {
    const affected = await db
      .select({ userID: memberships.userID })
      .from(memberships)
      .where(and(eq(memberships.roleID, roleID), eq(memberships.workspaceID, workspaceID)));

    await Promise.all(
      affected.map(({ userID }) =>
        Auth.invalidateSessionData({
          userID: toUserID(userID),
          workspaceID: input.workspaceID
        })
      )
    );
  }
};

export { updateRole };
