import { UnderscoreID } from "./mongo";
import { jsonToBuffer, DocJSON } from "./content-processing/conversions";
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
  getContentVersionsCollection,
  getContentsCollection,
  getVariantsCollection,
  getVersionsCollection
} from "#collections";
import initialContent from "#assets/initial-content.json";

const createWorkspace = async (
  user: UnderscoreID<FullUser<ObjectId>>,
  fastify: FastifyInstance,
  config?: {
    name?: string;
    logo?: string;
    description?: string;
    newUser?: boolean;
    plan?: string;
  }
): Promise<{ workspaceId: ObjectId; contentPieceId?: ObjectId }> => {
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
    ...(config?.newUser && {
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
        "editSnippets",
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
    const { customerId, subscription } = await fastify.billing.createCustomer({
      email: user.email,
      name: user.username,
      trial: config?.newUser,
      plan: config?.plan as "personal" | "team" | undefined
    });

    workspace.customerId = customerId;

    if (config?.newUser && subscription) {
      workspace.subscriptionStatus = subscription?.status;
      workspace.subscriptionPlan = "personal";
      workspace.subscriptionData = JSON.stringify(subscription);
      workspace.subscriptionExpiresAt = new Date(
        subscription.current_period_end * 1000
      ).toISOString();
    } else {
      workspace.subscriptionStatus = "canceled";
      workspace.subscriptionExpiresAt = new Date().toISOString();
    }
  }

  if (fastify.hostConfig.resend) {
    await fastify.email.addEmailToContactList(user.email, { username: user.username });
  }

  if (config?.newUser) {
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

  return { workspaceId, ...(config?.newUser && { contentPieceId }) };
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
  const versionsCollection = getVersionsCollection(db);
  const contentVersionsCollection = getContentVersionsCollection(db);
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
  await versionsCollection.deleteMany({
    workspaceId
  });
  await contentVersionsCollection.deleteMany({
    workspaceId
  });
  await fastify.search.deleteTenant(workspaceId);
  await fastify.billing.deleteCustomer(`${workspaceId}`);
};

export { createWorkspace, deleteWorkspace };
