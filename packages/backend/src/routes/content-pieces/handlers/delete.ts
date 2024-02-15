import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  contentPiece,
  FullContentPiece,
  getContentPiecesCollection,
  getContentPieceVariantsCollection,
  getContentsCollection,
  getContentVariantsCollection
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
  const contentPiece = await contentPiecesCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!contentPiece) throw errors.notFound("contentPiece");

  await contentPiecesCollection.deleteOne({ _id: contentPiece._id });
  await contentsCollection.deleteOne({ contentPieceId: contentPiece._id });
  await contentPieceVariantsCollection.deleteMany({
    contentPieceId: contentPiece._id,
    workspaceId: ctx.auth.workspaceId
  });
  await contentVariantsCollection.deleteMany({
    contentPieceId: contentPiece._id
  });
  publishContentPieceEvent(ctx, `${contentPiece.contentGroupId}`, {
    action: "delete",
    userId: `${ctx.auth.userId}`,
    data: { id: `${contentPiece._id}` }
  });
  ctx.fastify.routeCallbacks.run("contentPieces.delete", ctx, { contentPiece });
};

export { handler, inputSchema };
