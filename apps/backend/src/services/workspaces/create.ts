import {
  collections,
  memberships,
  publishingChannels,
  roles,
  type Permission,
  users,
  workspaces
} from "#backend/db";
import { rankBetweenNeighbors, toUUID, toWorkspaceID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { PUBLISHED_CHANNEL_CODE } from "#backend/lib/publishing";
import { ROOT_COLLECTION_NAME } from "#backend/lib/validation";
import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const DEFAULT_ROLES: Array<{
  name: string;
  permissions: Permission[];
  baseRole?: "admin" | "viewer";
}> = [
  { name: "Admin", permissions: [], baseRole: "admin" },
  { name: "Developer", permissions: ["content", "versions", "publishing", "api_keys"] },
  { name: "Editor", permissions: ["content", "versions", "publishing"] },
  { name: "Viewer", permissions: ["read:publishing"], baseRole: "viewer" }
];

const createWorkspace = async (input: { name: string; userID: string }) => {
  const userID = toUUID(input.userID);

  return db.transaction(async (tx) => {
    const [workspace] = await tx.insert(workspaces).values({ name: input.name }).returning();

    const createdRoles = await tx
      .insert(roles)
      .values(
        DEFAULT_ROLES.map((role) => ({
          workspaceID: workspace.id,
          name: role.name,
          permissions: role.permissions,
          baseRole: role.baseRole
        }))
      )
      .returning();
    const adminRole = createdRoles.find((role) => role.baseRole === "admin");

    if (!adminRole) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Admin role not found for workspace"
      });
    }

    await tx.insert(collections).values({
      workspaceID: workspace.id,
      parentID: null,
      name: ROOT_COLLECTION_NAME,
      rank: rankBetweenNeighbors()
    });
    await tx.insert(publishingChannels).values({
      workspaceID: workspace.id,
      code: PUBLISHED_CHANNEL_CODE,
      name: "Published",
      builtIn: true
    });
    await tx.insert(memberships).values({
      userID,
      workspaceID: workspace.id,
      roleID: adminRole.id
    });
    await tx
      .update(users)
      .set({ currentWorkspaceID: workspace.id, updatedAt: new Date() })
      .where(eq(users.id, userID));

    return { id: toWorkspaceID(workspace.id), name: workspace.name };
  });
};

export { createWorkspace };
