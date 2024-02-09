import { UnderscoreID } from "./mongo";
import { jsonToBuffer, DocJSON } from "./content-processing";
import { ObjectId, Binary } from "mongodb";
import { LexoRank } from "lexorank";
import { FastifyInstance } from "fastify";
import {
  blocks,
  embeds,
  getWorkspaceSettingsCollection,
  marks
} from "#collections/workspace-settings";
import { FullWorkspace, getWorkspacesCollection } from "#collections/workspaces";
import { getWorkspaceMembershipsCollection } from "#collections/workspace-memberships";
import { getRolesCollection } from "#collections/roles";
import { FullUser } from "#collections/users";
import {
  getContentGroupsCollection,
  getContentPieceVariantsCollection,
  getContentPiecesCollection,
  getContentVariantsCollection,
  getContentsCollection,
  getVariantsCollection
} from "#collections";
import initialContent from "#assets/initial-content.json";

const createWorkspace = async (
  user: UnderscoreID<FullUser<ObjectId>>,
  fastify: FastifyInstance,
  config?: {
    name?: string;
    logo?: string;
    description?: string;
    defaultContent?: boolean;
  }
): Promise<ObjectId> => {
  const db = fastify.mongo.db!;
  const workspacesCollection = getWorkspacesCollection(db);
  const workspaceSettingsCollection = getWorkspaceSettingsCollection(db);
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(db);
  const contentPiecesCollection = getContentPiecesCollection(db);
  const contentsCollection = getContentsCollection(db);
  const rolesCollection = getRolesCollection(db);
  const contentGroupsCollection = getContentGroupsCollection(db);
  const adminRoleId = new ObjectId();
  const workspaceId = new ObjectId();
  const ideasContentGroupId = new ObjectId();
  const contentPieceId = new ObjectId();
  const contentGroups = [
    { _id: ideasContentGroupId, name: "Ideas", ancestors: [], descendants: [], workspaceId },
    { _id: new ObjectId(), name: "Drafts", ancestors: [], descendants: [], workspaceId },
    {
      _id: new ObjectId(),
      name: "Published",
      ancestors: [],
      descendants: [],
      workspaceId
    }
  ];
  const workspace: UnderscoreID<FullWorkspace<ObjectId>> = {
    name: config?.name || `${user.username}'s workspace`,
    _id: workspaceId,
    contentGroups: [],
    ...(config?.logo && { logo: config.logo }),
    ...(config?.description && { description: config.description }),
    ...(config?.defaultContent && {
      contentGroups: contentGroups.map(({ _id }) => _id)
    })
  };

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
  await fastify.search.createTenant(workspaceId);

  if (fastify.hostConfig.billing) {
    const customerId = await fastify.billing.createCustomer({
      email: user.email,
      name: user.username
    });
    // TODO: Trial only for the first workspace
    const subscription = await fastify.billing.startTrial(customerId);

    workspace.customerId = customerId;
    workspace.subscriptionStatus = subscription.status;
    workspace.subscriptionPlan = "personal";
    workspace.subscriptionData = JSON.stringify(subscription);
  }

  if (config?.defaultContent) {
    await contentGroupsCollection.insertMany(contentGroups);
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
      content: new Binary(jsonToBuffer(initialContent as unknown as DocJSON))
    });
  }

  await workspacesCollection.insertOne(workspace);

  return workspaceId;
};
const deleteWorkspace = async (workspaceId: ObjectId, fastify: FastifyInstance): Promise<void> => {
  const db = fastify.mongo.db!;
  const workspacesCollection = getWorkspacesCollection(db);
  const workspaceSettingsCollection = getWorkspaceSettingsCollection(db);
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(db);
  const contentPiecesCollection = getContentPiecesCollection(db);
  const contentsCollection = getContentsCollection(db);
  const rolesCollection = getRolesCollection(db);
  const variantsCollection = getVariantsCollection(db);
  const contentPieceVariantsCollection = getContentPieceVariantsCollection(db);
  const contentVariantsCollection = getContentVariantsCollection(db);
  const contentPieceIds = await contentPiecesCollection
    .find({ workspaceId })
    .map(({ _id }) => _id)
    .toArray();

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
    contentPieceId: { $in: contentPieceIds }
  });
  await variantsCollection.deleteMany({
    workspaceId
  });
  await contentPieceVariantsCollection.deleteMany({
    workspaceId
  });
  await contentVariantsCollection.deleteMany({
    contentPieceId: { $in: contentPieceIds }
  });
  await fastify.search.deleteTenant(workspaceId);
};

export { createWorkspace, deleteWorkspace };
