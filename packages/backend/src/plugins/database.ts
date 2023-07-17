import { publicPlugin } from "#lib/plugin";
import { getContentPiecesCollection } from "#database/content-pieces";
import { getRolesCollection } from "#database/roles";
import { getTagsCollection } from "#database/tags";
import { getTokensCollection } from "#database/tokens";
import { getUserSettingsCollection } from "#database/user-settings";
import { getWebhooksCollection } from "#database/webhooks";
import { getWorkspaceSettingsCollection } from "#database/workspace-settings";
import { getContentsCollection } from "#database/contents";
import { getUsersCollection } from "#database/users";
import { getCommentThreadsCollection } from "#database/comment-threads";
import { getCommentsCollection } from "#database/comments";
import {
  getContentPieceVariantsCollection,
  getContentVariantsCollection,
  getVariantsCollection
} from "#database";

const databasePlugin = publicPlugin(async (fastify) => {
  const db = fastify.mongo.db!;
  const contentPiecesCollection = getContentPiecesCollection(db);
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

  await Promise.all([
    contentPiecesCollection.createIndex({ workspaceId: 1 }),
    contentPiecesCollection.createIndex({ contentGroupId: 1 }),
    contentPiecesCollection.createIndex({ tags: 1 }),
    contentPieceVariantsCollection.createIndex({ contentPieceId: 1, variantId: 1 }),
    contentPieceVariantsCollection.createIndex({ contentPieceId: 1 }),
    contentPieceVariantsCollection.createIndex({ workspaceId: 1 }),
    commentThreadsCollection.createIndex({ contentPieceId: 1, workspaceId: 1 }),
    commentThreadsCollection.createIndex({ fragment: 1, workspaceId: 1 }),
    commentsCollection.createIndex({ threadId: 1, workspaceId: 1 }),
    contentsCollection.createIndex({ contentPieceId: 1 }),
    contentVariantsCollection.createIndex({ contentPieceId: 1, variantId: 1 }),
    contentVariantsCollection.createIndex({ contentPieceId: 1 }),
    contentVariantsCollection.createIndex({ workspaceId: 1 }),
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
    variantsCollection.createIndex({ name: 1 })
  ]);
});

export { databasePlugin };
