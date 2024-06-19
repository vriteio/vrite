import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  contentPiece,
  FullContentPiece,
  getCommentsCollection,
  getCommentThreadsCollection,
  getContentPiecesCollection,
  getContentPieceVariantsCollection,
  getContentsCollection,
  getContentVariantsCollection,
  getContentVersionsCollection,
  getVersionsCollection
} from "#collections";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID } from "#lib/mongo";
import { publishContentPieceEvent } from "#events";

declare module "fastify" {
  interface RouteCallbacks {
    "contentPieces.delete": {
      ctx: AuthenticatedContext;
      data: {
        contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
      };
    };
  }
}

const inputSchema = contentPiece.pick({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentPieceVariantsCollection = getContentPieceVariantsCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const contentVariantsCollection = getContentVariantsCollection(ctx.db);
  const commentThreadsCollection = getCommentThreadsCollection(ctx.db);
  const commentsCollection = getCommentsCollection(ctx.db);
  const versionsCollection = getVersionsCollection(ctx.db);
  const contentVersionsCollection = getContentVersionsCollection(ctx.db);
  const contentPiece = await contentPiecesCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!contentPiece) throw errors.notFound("contentPiece");

  const commentThreads = await commentThreadsCollection
    .find({
      contentPieceId: contentPiece._id
    })
    .toArray();

  await contentPiecesCollection.deleteOne({ _id: contentPiece._id });
  await contentsCollection.deleteOne({ contentPieceId: contentPiece._id });
  await contentPieceVariantsCollection.deleteMany({
    contentPieceId: contentPiece._id,
    workspaceId: ctx.auth.workspaceId
  });
  await contentVariantsCollection.deleteMany({
    contentPieceId: contentPiece._id,
    workspaceId: ctx.auth.workspaceId
  });
  await versionsCollection.deleteMany({
    contentPieceId: contentPiece._id,
    workspaceId: ctx.auth.workspaceId
  });
  await contentVersionsCollection.deleteMany({
    contentPieceId: contentPiece._id
  });
  await commentThreadsCollection.deleteMany({
    contentPieceId: contentPiece._id
  });
  await commentsCollection.deleteMany({
    threadId: { $in: commentThreads.map((thread) => thread._id) }
  });
  publishContentPieceEvent(ctx, `${contentPiece.contentGroupId}`, {
    action: "delete",
    userId: `${ctx.auth.userId}`,
    data: { id: `${contentPiece._id}` }
  });
  ctx.fastify.routeCallbacks.run("contentPieces.delete", ctx, { contentPiece });
};

export { handler, inputSchema };
