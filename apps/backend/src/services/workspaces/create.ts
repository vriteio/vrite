import {
  collectionsDB,
  membershipDB,
  usersDB,
  workspacesDB,
  toWorkspaceID,
  rolesDB
} from "#backend/db";
import type { FullCollection, FullRole, FullWorkspace, Permission } from "#backend/db";
import { generateUUID, toUUID, UnderscoreID } from "#backend/lib/mongo";
import { ROOT_COLLECTION_NAME } from "#backend/services/collections";
import { ORPCError } from "@orpc/server";
import type { UUID } from "#backend/lib/mongo";

const DEFAULT_ROLES: Array<{
  name: string;
  permissions: Permission[];
  baseRole?: "admin" | "viewer";
}> = [
  {
    name: "Admin",
    // baseRole used for access control, no specific permissions needed
    permissions: [],
    baseRole: "admin"
  },
  {
    name: "Developer",
    permissions: ["content", "api_keys"]
  },
  {
    name: "Editor",
    permissions: ["content"]
  },
  {
    name: "Viewer",
    // baseRole used for access control, no specific permissions needed
    permissions: [],
    baseRole: "viewer"
  }
];

const createWorkspace = async (input: { name: string; userID: string }) => {
  const workspace: UnderscoreID<FullWorkspace<UUID>> = {
    _id: generateUUID(),
    name: input.name
  };
  const rootCollection: UnderscoreID<FullCollection<UUID>> = {
    _id: generateUUID(),
    workspaceID: workspace._id,
    name: ROOT_COLLECTION_NAME,
    ancestors: [],
    descendants: []
  };
  const roles: Array<UnderscoreID<FullRole<UUID>>> = DEFAULT_ROLES.map((role) => ({
    _id: generateUUID(),
    workspaceID: workspace._id,
    name: role.name,
    permissions: role.permissions,
    ...(role.baseRole && { baseRole: role.baseRole })
  }));
  const adminRole = roles.find((role) => {
    return role.baseRole === "admin";
  });

  if (!adminRole) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Admin role not found for workspace"
    });
  }

  await workspacesDB.insertOne(workspace);
  await collectionsDB.insertOne(rootCollection);
  await rolesDB.insertMany(roles);
  await membershipDB.insertOne({
    _id: generateUUID(),
    userID: toUUID(input.userID),
    workspaceID: workspace._id,
    roleID: adminRole._id
  });
  await usersDB.updateOne(
    { _id: toUUID(input.userID) },
    { $set: { currentWorkspaceID: workspace._id } }
  );

  return {
    id: toWorkspaceID(workspace._id),
    name: workspace.name
  };
};

export { createWorkspace };
