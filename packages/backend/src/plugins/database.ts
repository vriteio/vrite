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

const databasePlugin = publicPlugin(async (fastify) => {
  const db = fastify.mongo.db!;
  const contentPiecesCollection = getContentPiecesCollection(db);
  const contentsCollection = getContentsCollection(db);
  const rolesCollection = getRolesCollection(db);
  const tagsCollection = getTagsCollection(db);
  const tokensCollection = getTokensCollection(db);
  const usersCollection = getUsersCollection(db);
  const userSettingsCollection = getUserSettingsCollection(db);
  const webhooksCollection = getWebhooksCollection(db);
  const workspaceMembershipsCollection = getWorkspaceSettingsCollection(db);
  const workspaceSettingsCollection = getWorkspaceSettingsCollection(db);

  await Promise.all([
    contentPiecesCollection.createIndex({ workspaceId: 1 }),
    contentPiecesCollection.createIndex({ contentGroupId: 1 }),
    contentPiecesCollection.createIndex({ tags: 1 }),
    contentsCollection.createIndex({ contentPieceId: 1 }),
    rolesCollection.createIndex({ workspaceId: 1 }),
    tagsCollection.createIndex({ workspaceId: 1 }),
    tokensCollection.createIndex({ workspaceId: 1 }),
    usersCollection.createIndex(
      { emailVerificationCodeExpiresAt: 1 },
      { expireAfterSeconds: 0, sparse: true }
    ),
    userSettingsCollection.createIndex({ userId: 1 }, { unique: true }),
    webhooksCollection.createIndex({ workspaceId: 1 }),
    webhooksCollection.createIndex({ workspaceId: 1, event: 1 }),
    workspaceMembershipsCollection.createIndex({ workspaceId: 1 }),
    workspaceMembershipsCollection.createIndex({ userId: 1 }),
    workspaceMembershipsCollection.createIndex({ roleId: 1 }),
    workspaceMembershipsCollection.createIndex(
      { inviteVerificationCodeExpireAt: 1 },
      { expireAfterSeconds: 0, sparse: true }
    ),
    workspaceSettingsCollection.createIndex({ workspaceId: 1 }),
    usersCollection.createIndex({ email: 1 }, { unique: true })
  ]);
});

export { databasePlugin };
