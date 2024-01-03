import { ObjectId } from "mongodb";
import {
  getGitDataCollection,
  getContentGroupsCollection,
  getContentPiecesCollection,
  getContentsCollection,
  getWorkspacesCollection,
  FullContentPiece
} from "#collections";
import { publishGitDataEvent, publishContentGroupEvent } from "#events";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID } from "#lib/mongo";
import { useGitSyncIntegration } from "#lib/git-sync";

const handler = async (ctx: AuthenticatedContext): Promise<void> => {
  const gitDataCollection = getGitDataCollection(ctx.db);
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const workspaceCollection = getWorkspacesCollection(ctx.db);
  const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

  if (!gitData) throw errors.notFound("gitData");

  const gitSyncIntegration = useGitSyncIntegration(ctx, gitData);

  if (!gitSyncIntegration) throw errors.serverError();

  const {
    lastCommit,
    newContentGroups,
    newContentPieces,
    newContents,
    newDirectories,
    newRecords,
    topContentGroup
  } = await gitSyncIntegration.initialSync();

  await contentGroupsCollection.insertMany(newContentGroups);
  await contentPiecesCollection.insertMany(newContentPieces);
  await contentsCollection.insertMany(newContents);
  await gitDataCollection.updateOne(
    { workspaceId: ctx.auth.workspaceId },
    {
      $set: {
        records: newRecords,
        directories: newDirectories,
        contentGroupId: topContentGroup._id,
        lastCommitDate: lastCommit.date,
        lastCommitId: lastCommit.id
      }
    }
  );
  await workspaceCollection.updateOne(
    { _id: ctx.auth.workspaceId },
    {
      $push: { contentGroups: topContentGroup._id }
    }
  );
  publishGitDataEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: {
      records: newRecords.map((record) => ({
        ...record,
        contentPieceId: `${record.contentPieceId}`
      })),
      directories: newDirectories.map((directory) => ({
        ...directory,
        contentGroupId: `${directory.contentGroupId}`
      })),
      lastCommitDate: lastCommit.date,
      lastCommitId: lastCommit.id
    }
  });
  publishContentGroupEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "create",
    userId: `${ctx.auth.userId}`,
    data: {
      ...topContentGroup,
      ancestors: topContentGroup.ancestors.map((ancestor) => `${ancestor}`),
      descendants: topContentGroup.descendants.map((descendant) => `${descendant}`),
      id: `${topContentGroup._id}`
    }
  });

  const bulkUpsertDetails: Array<{
    contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
    content: Buffer;
  }> = [];

  newContentPieces.forEach((contentPiece) => {
    const { content } =
      newContents.find(({ contentPieceId }) => {
        return contentPieceId.equals(contentPiece._id);
      }) || {};

    if (content) {
      bulkUpsertDetails.push({
        contentPiece,
        content: Buffer.from(content.buffer)
      });
    }
  });
  ctx.fastify.search.bulkUpsertContent(bulkUpsertDetails);
};

export { handler };
