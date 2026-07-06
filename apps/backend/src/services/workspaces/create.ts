import {
  collectionsDB,
  membershipDB,
  usersDB,
  workspacesDB,
  toWorkspaceID,
  rolesDB
} from "#backend/db";
import type { FullCollection, FullRole, FullWorkspace, Permission } from "#backend/db";
import { toObjectID, UnderscoreID } from "#backend/lib/mongo";
import { ROOT_COLLECTION_NAME } from "#backend/services/collections";
import { ORPCError } from "@orpc/server";
import { ObjectId } from "mongodb";

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
  const workspace: UnderscoreID<FullWorkspace<ObjectId>> = {
    _id: new ObjectId(),
    name: input.name
  };
  const rootCollection: UnderscoreID<FullCollection<ObjectId>> = {
    _id: new ObjectId(),
    workspaceID: workspace._id,
    name: ROOT_COLLECTION_NAME,
    ancestors: [],
    descendants: []
  };
  const roles: Array<UnderscoreID<FullRole<ObjectId>>> = DEFAULT_ROLES.map((role) => ({
    _id: new ObjectId(),
    workspaceID: workspace._id,
    name: role.name,
    permissions: role.permissions,
    baseRole: role.baseRole
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
    _id: new ObjectId(),
    userID: toObjectID(input.userID),
    workspaceID: workspace._id,
    roleID: adminRole._id
  });
  await usersDB.updateOne(
    { _id: toObjectID(input.userID) },
    { $set: { currentWorkspaceID: workspace._id } }
  );

  return {
    id: toWorkspaceID(workspace._id),
    name: workspace.name
  };
};

export { createWorkspace };
