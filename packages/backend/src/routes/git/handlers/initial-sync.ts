import { ObjectId } from "mongodb";
import {
  getGitDataCollection,
  getContentGroupsCollection,
  getContentPiecesCollection,
  getContentsCollection,
  getWorkspacesCollection,
  FullContentPiece,
  getContentPieceVariantsCollection,
  getContentVariantsCollection,
  getVariantsCollection,
  FullContentGroup
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
  const contentPieceVariantsCollection = getContentPieceVariantsCollection(ctx.db);
  const contentVariantsCollection = getContentVariantsCollection(ctx.db);
  const variantsCollection = getVariantsCollection(ctx.db);
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
    newContentPieceVariants,
    newContentVariants,
    newVariants,
    topContentGroup
  } = await gitSyncIntegration.initialSync();

  if (newContentGroups.length) {
    await contentGroupsCollection.insertMany(newContentGroups);
  }

  if (newContentPieces.length) {
    await contentPiecesCollection.insertMany(newContentPieces);
  }

  if (newContents.length) {
    await contentsCollection.insertMany(newContents);
  }

  if (newContentPieceVariants.length) {
    await contentPieceVariantsCollection.insertMany(newContentPieceVariants);
  }

  if (newContentVariants.length) {
    await contentVariantsCollection.insertMany(newContentVariants);
  }

  if (newVariants.length) {
    await variantsCollection.insertMany(newVariants);
  }

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
        variantId: record.variantId ? `${record.variantId}` : undefined,
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

  const bulkUpsertEntries: Array<{
    contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
    contentGroup?: UnderscoreID<FullContentGroup<ObjectId>>;
    content: Buffer;
    variantId?: string | ObjectId;
  }> = [];

  newContentPieces.forEach((contentPiece) => {
    const { content } =
      newContents.find(({ contentPieceId }) => {
        return contentPieceId.equals(contentPiece._id);
      }) || {};
    const contentPieceVariants = newContentPieceVariants.filter(({ contentPieceId }) => {
      return contentPieceId.equals(contentPiece._id);
    });
    const contentVariants = newContentVariants.filter(({ contentPieceId }) => {
      return contentPieceId.equals(contentPiece._id);
    });
    const contentGroup = newContentGroups.find(({ _id }) => {
      return _id.equals(contentPiece.contentGroupId);
    });

    if (content) {
      bulkUpsertEntries.push({
        contentPiece,
        contentGroup,
        content: Buffer.from(content.buffer),
        variantId: "base"
      });
    }

    contentPieceVariants.forEach((contentPieceVariant) => {
      const { _id, contentPieceId, variantId, ...variantData } = contentPieceVariant;
      const { content } =
        contentVariants.find(({ contentPieceId, variantId }) => {
          return (
            contentPieceId.equals(contentPiece._id) &&
            variantId.equals(contentPieceVariant.variantId)
          );
        }) || {};

      if (content) {
        bulkUpsertEntries.push({
          contentPiece: {
            ...contentPiece,
            ...variantData
          },
          contentGroup,
          content: Buffer.from(content.buffer),
          variantId: contentPieceVariant.variantId
        });
      }
    });
  });
  ctx.fastify.search.content.bulkUpsert({
    entries: bulkUpsertEntries,
    workspaceId: ctx.auth.workspaceId
  });
};

export { handler };
