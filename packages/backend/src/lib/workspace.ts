import { UnderscoreID } from "./mongo";
import { jsonToBuffer, DocJSON } from "./processing";
import { ObjectId, Db, Binary } from "mongodb";
import { LexoRank } from "lexorank";
import {
  blocks,
  embeds,
  getWorkspaceSettingsCollection,
  marks
} from "#database/workspace-settings";
import { getWorkspacesCollection } from "#database/workspaces";
import { getWorkspaceMembershipsCollection } from "#database/workspace-memberships";
import { getRolesCollection } from "#database/roles";
import { FullUser } from "#database/users";
import {
  getContentPieceVariantsCollection,
  getContentPiecesCollection,
  getContentVariantsCollection,
  getContentsCollection,
  getVariantsCollection
} from "#database";
import initialContent from "#assets/initial-content.json";

const createWorkspace = async (
  user: UnderscoreID<FullUser<ObjectId>>,
  db: Db,
  config?: {
    name?: string;
    logo?: string;
    description?: string;
    defaultContent?: boolean;
  }
): Promise<ObjectId> => {
  const workspacesCollection = getWorkspacesCollection(db);
  const workspaceSettingsCollection = getWorkspaceSettingsCollection(db);
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(db);
  const contentPiecesCollection = getContentPiecesCollection(db);
  const contentsCollection = getContentsCollection(db);
  const rolesCollection = getRolesCollection(db);
  const adminRoleId = new ObjectId();
  const workspaceId = new ObjectId();
  const ideasContentGroupId = new ObjectId();
  const contentPieceId = new ObjectId();

  await workspacesCollection.insertOne({
    name: config?.name || `${user.username}'s workspace`,
    _id: workspaceId,
    contentGroups: [],
    ...(config?.logo && { logo: config.logo }),
    ...(config?.description && { description: config.description }),
    ...(config?.defaultContent && {
      contentGroups: [
        { _id: ideasContentGroupId, name: "Ideas" },
        { _id: new ObjectId(), name: "Drafts" },
        { _id: new ObjectId(), name: "Published", locked: true }
      ]
    })
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
        "manageWorkspace",
        "manageExtensions",
        "manageVariants"
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

  if (config?.defaultContent) {
    await contentPiecesCollection.insertOne({
      _id: contentPieceId,
      workspaceId,
      contentGroupId: ideasContentGroupId,
      title: "Hello World!",
      slug: "hello-world",
      members: [],
      tags: [],
      order: LexoRank.min().toString()
    });
    await contentsCollection.insertOne({
      _id: new ObjectId(),
      contentPieceId,
      contentGroupId: ideasContentGroupId,
      content: new Binary(jsonToBuffer(initialContent as DocJSON))
    });
  }

  return workspaceId;
};
const deleteWorkspace = async (workspaceId: ObjectId, db: Db): Promise<void> => {
  const workspacesCollection = getWorkspacesCollection(db);
  const workspaceSettingsCollection = getWorkspaceSettingsCollection(db);
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(db);
  const contentPiecesCollection = getContentPiecesCollection(db);
  const contentsCollection = getContentsCollection(db);
  const rolesCollection = getRolesCollection(db);
  const variantsCollection = getVariantsCollection(db);
  const contentPieceVariantsCollection = getContentPieceVariantsCollection(db);
  const contentVariantsCollection = getContentVariantsCollection(db);

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
  await variantsCollection.deleteMany({
    workspaceId
  });
  await contentPieceVariantsCollection.deleteMany({
    workspaceId
  });
  await contentVariantsCollection.deleteMany({
    workspaceId
  });
};

export { createWorkspace, deleteWorkspace };
