import { LexoRank } from "lexorank";
import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  getContentPiecesCollection,
  getContentGroupsCollection,
  FullContentPiece
} from "#collections";
import { UnderscoreID, zodId } from "#lib/mongo";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";

declare module "fastify" {
  interface RouteCallbacks {
    "contentPieces.move": {
      ctx: AuthenticatedContext;
      data: {
        contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
        updatedContentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
        nextReferenceId?: ObjectId;
        previousReferenceId?: ObjectId;
      };
    };
  }
}

const inputSchema = z.object({
  id: zodId(),
  contentGroupId: zodId().optional(),
  nextReferenceId: zodId().optional(),
  previousReferenceId: zodId().optional()
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentPiece = await contentPiecesCollection.findOne({
    _id: new ObjectId(input.id)
  });
  const contentGroup = await contentGroupsCollection.findOne({
    _id: new ObjectId(input.contentGroupId || contentPiece?.contentGroupId),
    workspaceId: ctx.auth.workspaceId
  });

  if (!contentGroup) throw errors.notFound("contentGroup");
  if (!contentPiece) throw errors.notFound("contentPiece");

  let nextReferenceContentPiece: UnderscoreID<FullContentPiece<ObjectId>> | null = null;
  let previousReferenceContentPiece: UnderscoreID<FullContentPiece<ObjectId>> | null = null;

  if (input.nextReferenceId) {
    nextReferenceContentPiece = await contentPiecesCollection.findOne({
      _id: new ObjectId(input.nextReferenceId)
    });
  }

  if (input.previousReferenceId) {
    previousReferenceContentPiece = await contentPiecesCollection.findOne({
      _id: new ObjectId(input.previousReferenceId)
    });
  }

  let newOrder = "";

  if (!previousReferenceContentPiece && nextReferenceContentPiece) {
    newOrder = LexoRank.parse(nextReferenceContentPiece.order).genPrev().toString();
  } else if (!nextReferenceContentPiece && previousReferenceContentPiece) {
    newOrder = LexoRank.parse(previousReferenceContentPiece.order).genNext().toString();
  } else if (previousReferenceContentPiece && nextReferenceContentPiece) {
    newOrder = LexoRank.parse(nextReferenceContentPiece.order)
      .between(LexoRank.parse(previousReferenceContentPiece.order))
      .toString();
  } else if (contentPiece) {
    const [lastContentPiece] = await contentPiecesCollection
      .find({ contentGroupId: contentGroup._id })
      .sort({ order: -1 })
      .limit(1)
      .toArray();

    previousReferenceContentPiece = lastContentPiece || null;

    if (lastContentPiece) {
      newOrder = LexoRank.parse(lastContentPiece.order).genNext().toString();
    } else {
      newOrder = LexoRank.min().toString();
    }
  }

  const update: Partial<UnderscoreID<FullContentPiece<ObjectId>>> = { order: newOrder };

  if (input.contentGroupId) {
    update.contentGroupId = new ObjectId(input.contentGroupId);
  }

  await contentPiecesCollection.updateOne(
    { _id: new ObjectId(input.id) },
    {
      $set: update
    }
  );
  ctx.fastify.routeCallbacks.run("contentPieces.move", ctx, {
    contentPiece,
    updatedContentPiece: {
      ...contentPiece,
      ...update
    },
    nextReferenceId: nextReferenceContentPiece?._id,
    previousReferenceId: previousReferenceContentPiece?._id
  });
};

export { inputSchema, handler };
