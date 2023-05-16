import { UnderscoreID } from "./mongo";
import { ObjectId, Db } from "mongodb";
import {
  blocks,
  embeds,
  getWorkspaceSettingsCollection,
  marks
} from "#database/workspace-settings";
import { getWorkspacesCollection } from "#database/workspaces";
import { getUserSettingsCollection } from "#database/user-settings";
import { getWorkspaceMembershipsCollection } from "#database/workspace-memberships";
import { getRolesCollection } from "#database/roles";
import { FullUser } from "#database/users";
import { getContentPiecesCollection, getContentsCollection } from "#database";

const createWorkspace = async (
  user: UnderscoreID<FullUser<ObjectId>>,
  db: Db,
  config?: {
    name: string;
    logo?: string;
    description?: string;
  }
): Promise<ObjectId> => {
  const workspacesCollection = getWorkspacesCollection(db);
  const workspaceSettingsCollection = getWorkspaceSettingsCollection(db);
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(db);
  const rolesCollection = getRolesCollection(db);
  const adminRoleId = new ObjectId();
  const workspaceId = new ObjectId();

  await workspacesCollection.insertOne({
    name: config?.name || `${user.username}'s workspace`,
    contentGroups: [],
    _id: workspaceId,
    ...(config?.logo && { logo: config.logo }),
    ...(config?.description && { description: config.description })
  });
  await workspaceSettingsCollection.insertOne({
    _id: new ObjectId(),
    workspaceId,
    blocks: [...blocks],
    embeds: [...embeds],
    marks: [...marks],
    prettierConfig: "{}"
  });
  await rolesCollection.insertMany([
    {
      _id: adminRoleId,
      name: "Admin",
      baseType: "admin",
      workspaceId,
      permissions: [
        "editContent",
        "editMetadata",
        "manageDashboard",
        "manageTokens",
        "manageWebhooks",
        "manageWorkspace"
      ]
    },
    {
      _id: new ObjectId(),
      name: "Viewer",
      baseType: "viewer",
      workspaceId,
      permissions: []
    }
  ]);
  await workspaceMembershipsCollection.insertOne({
    _id: new ObjectId(),
    workspaceId,
    userId: user._id,
    roleId: adminRoleId
  });

  return workspaceId;
};
const deleteWorkspace = async (workspaceId: ObjectId, db: Db): Promise<void> => {
  const workspacesCollection = getWorkspacesCollection(db);
  const workspaceSettingsCollection = getWorkspaceSettingsCollection(db);
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(db);
  const contentPiecesCollection = getContentPiecesCollection(db);
  const contentsCollection = getContentsCollection(db);
  const rolesCollection = getRolesCollection(db);

  await workspacesCollection.deleteOne({
    _id: workspaceId
  });
  await workspaceSettingsCollection.deleteOne({
    workspaceId
  });
  await rolesCollection.deleteMany({
    workspaceId
  });
  await workspaceMembershipsCollection.deleteMany({
    workspaceId
  });
  await contentPiecesCollection.deleteMany({
    workspaceId
  });
  await contentsCollection.deleteMany({
    workspaceId
  });
};

export { createWorkspace, deleteWorkspace };
