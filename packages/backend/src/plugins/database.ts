import mongoPlugin from "@fastify/mongodb";
import { createPlugin } from "#lib/plugin";
import {
  getUserSettingsCollection,
  getWebhooksCollection,
  getWorkspaceSettingsCollection,
  getContentsCollection,
  getUsersCollection,
  getCommentThreadsCollection,
  getCommentsCollection,
  getContentPiecesCollection,
  getRolesCollection,
  getTagsCollection,
  getTokensCollection,
  getContentGroupsCollection,
  getContentPieceVariantsCollection,
  getContentVariantsCollection,
  getVariantsCollection,
  getGitDataCollection,
  getWorkspacesCollection
} from "#collections";

const databasePlugin = createPlugin(async (fastify) => {
  await fastify.register(mongoPlugin, {
    forceClose: true,
    url: fastify.config.MONGO_URL
  });

  const db = fastify.mongo.db!;
  const contentPiecesCollection = getContentPiecesCollection(db);
  const contentGroupsCollection = getContentGroupsCollection(db);
  const commentThreadsCollection = getCommentThreadsCollection(db);
  const commentsCollection = getCommentsCollection(db);
  const contentsCollection = getContentsCollection(db);
  const rolesCollection = getRolesCollection(db);
  const tagsCollection = getTagsCollection(db);
  const tokensCollection = getTokensCollection(db);
  const usersCollection = getUsersCollection(db);
  const userSettingsCollection = getUserSettingsCollection(db);
  const webhooksCollection = getWebhooksCollection(db);
  const workspaceMembershipsCollection = getWorkspaceSettingsCollection(db);
  const workspaceSettingsCollection = getWorkspaceSettingsCollection(db);
  const extensionsCollection = getWorkspaceSettingsCollection(db);
  const variantsCollection = getVariantsCollection(db);
  const contentPieceVariantsCollection = getContentPieceVariantsCollection(db);
  const contentVariantsCollection = getContentVariantsCollection(db);
  const gitDataCollection = getGitDataCollection(db);
  const workspacesCollection = getWorkspacesCollection(db);
  const createIndexes = [
    contentPiecesCollection.createIndex({ workspaceId: 1 }),
    contentPiecesCollection.createIndex({ contentGroupId: 1 }),
    contentPiecesCollection.createIndex({ tags: 1 }),
    contentPieceVariantsCollection.createIndex({ contentPieceId: 1, variantId: 1 }),
    contentPieceVariantsCollection.createIndex({ workspaceId: 1, variantId: 1 }),
    contentPieceVariantsCollection.createIndex({ contentPieceId: 1 }),
    contentPieceVariantsCollection.createIndex({ workspaceId: 1 }),
    contentGroupsCollection.createIndex({ workspaceId: 1 }),
    contentGroupsCollection.createIndex({ ancestor: 1 }),
    contentGroupsCollection.createIndex({ descendants: 1 }),
    commentThreadsCollection.createIndex({ contentPieceId: 1, workspaceId: 1 }),
    commentThreadsCollection.createIndex({ fragment: 1, workspaceId: 1 }),
    commentsCollection.createIndex({ threadId: 1, workspaceId: 1 }),
    contentsCollection.createIndex({ contentPieceId: 1 }),
    contentVariantsCollection.createIndex({ contentPieceId: 1, variantId: 1 }),
    contentVariantsCollection.createIndex({ variantId: 1 }),
    contentVariantsCollection.createIndex({ contentPieceId: 1 }),
    rolesCollection.createIndex({ workspaceId: 1 }),
    tagsCollection.createIndex({ workspaceId: 1 }),
    tokensCollection.createIndex({ workspaceId: 1 }),
    tokensCollection.createIndex({ extensionId: 1 }, { sparse: true }),
    usersCollection.createIndex(
      { emailVerificationCodeExpiresAt: 1 },
      { expireAfterSeconds: 0, sparse: true }
    ),
    userSettingsCollection.createIndex({ userId: 1 }, { unique: true }),
    webhooksCollection.createIndex({ workspaceId: 1 }),
    webhooksCollection.createIndex({ workspaceId: 1, event: 1 }),
    webhooksCollection.createIndex({ extensionId: 1 }, { sparse: true }),
    workspaceMembershipsCollection.createIndex({ workspaceId: 1 }),
    workspaceMembershipsCollection.createIndex({ userId: 1 }),
    workspaceMembershipsCollection.createIndex({ roleId: 1 }),
    workspaceMembershipsCollection.createIndex(
      { inviteVerificationCodeExpireAt: 1 },
      { expireAfterSeconds: 0, sparse: true }
    ),
    workspaceSettingsCollection.createIndex({ workspaceId: 1 }),
    usersCollection.createIndex({ email: 1 }, { unique: true }),
    extensionsCollection.createIndex({ workspaceId: 1 }),
    extensionsCollection.createIndex({ name: 1 }),
    variantsCollection.createIndex({ workspaceId: 1 }),
    variantsCollection.createIndex({ key: 1 }),
    gitDataCollection.createIndex({ workspaceId: 1 }, { unique: true }),
    gitDataCollection.createIndex({ "records.contentPieceId": 1 })
  ];

  if (fastify.hostConfig.billing) {
    createIndexes.push(workspacesCollection.createIndex({ customerId: 1 }, { sparse: true }));
  }

  await Promise.all(createIndexes);
});

export { databasePlugin };
