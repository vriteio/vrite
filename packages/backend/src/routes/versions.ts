import { Db, ObjectId } from "mongodb";
import { z } from "zod";
import { isAuthenticated } from "#lib/middleware";
import { UnderscoreID } from "#lib/mongo";
import { procedure, router } from "#lib/trpc";
import * as errors from "#lib/errors";
import {
  FullVersion,
  getContentPieceVariantsCollection,
  getContentPiecesCollection,
  getContentVariantsCollection,
  getContentsCollection,
  getVersionsCollection,
  version
} from "#database";

const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/versions";
const createVersion = async (
  db: Db,
  data: Pick<FullVersion<ObjectId>, "name" | "contentPieceId" | "variantId" | "workspaceId">
): Promise<ObjectId> => {
  const versionsCollection = getVersionsCollection(db);
  const contentPiecesCollection = getContentPiecesCollection(db);
  const contentsCollection = getContentsCollection(db);
  const contentPieceVariantsCollection = getContentPieceVariantsCollection(db);
  const contentVariantsCollection = getContentVariantsCollection(db);

  let contentPiece = await contentPiecesCollection.findOne({
    _id: data.contentPieceId,
    workspaceId: data.workspaceId
  });

  if (!contentPiece) throw errors.notFound("contentPiece");

  let content = await contentsCollection.findOne({
    contentPieceId: contentPiece._id
  });

  if (!content) throw errors.notFound("content");

  if (data.variantId) {
    const contentPieceVariant = await contentPieceVariantsCollection.findOne({
      contentPieceId: contentPiece._id,
      variantId: data.variantId,
      workspaceId: data.workspaceId
    });

    if (!contentPieceVariant) throw errors.notFound("contentPieceVariant");

    const contentVariant = await contentVariantsCollection.findOne({
      contentPieceId: contentPiece._id,
      variantId: data.variantId
    });

    if (!contentVariant) throw errors.notFound("contentVariant");

    contentPiece = { ...contentPiece, ...contentPieceVariant };
    content = { ...content, ...contentVariant };
  }

  const version: UnderscoreID<FullVersion<ObjectId>> = {
    _id: new ObjectId(),
    name: data.name,
    date: new Date(),
    content: content.content,
    contentPiece: {
      members: contentPiece.members,
      tags: contentPiece.tags,
      title: contentPiece.title,
      description: contentPiece.description,
      slug: contentPiece.slug,
      canonicalLink: contentPiece.canonicalLink,
      coverAlt: contentPiece.coverAlt,
      coverUrl: contentPiece.coverUrl,
      customData: contentPiece.customData,
      date: contentPiece.date
    },
    contentPieceId: contentPiece._id,
    variantId: data.variantId,
    workspaceId: data.workspaceId
  };

  await versionsCollection.insertOne(version);

  return version._id;
};
const versionsRouter = router({
  create: authenticatedProcedure
    .input(version.pick({ name: true, contentPieceId: true, variantId: true }))
    .output(version.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const versionId = await createVersion(ctx.db, {
        name: input.name,
        contentPieceId: new ObjectId(input.contentPieceId),
        variantId: new ObjectId(input.variantId),
        workspaceId: ctx.auth.workspaceId
      });

      return { id: `${versionId}` };
    }),
  delete: authenticatedProcedure
    .input(
      version.pick({
        id: true
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const versionsCollection = getVersionsCollection(ctx.db);
      const { deletedCount } = await versionsCollection.deleteOne({
        _id: new ObjectId(input.id),
        workspaceId: ctx.auth.workspaceId
      });

      if (!deletedCount) throw errors.notFound("version");
    }),
  restore: authenticatedProcedure
    .input(
      version.pick({
        id: true
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const versionsCollection = getVersionsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const contentPieceVariantsCollection = getContentPieceVariantsCollection(ctx.db);
      const contentVariantsCollection = getContentVariantsCollection(ctx.db);
      const version = await versionsCollection.findOne({
        _id: new ObjectId(input.id),
        workspaceId: ctx.auth.workspaceId
      });

      if (!version) throw errors.notFound("version");

      if (version.variantId) {
        const contentPieceVariantUpdateResult = await contentPieceVariantsCollection.updateOne(
          {
            contentPieceId: version.contentPieceId,
            variantId: version.variantId,
            workspaceId: ctx.auth.workspaceId
          },
          {
            $set: version.contentPiece
          }
        );

        if (!contentPieceVariantUpdateResult.matchedCount) {
          throw errors.notFound("contentPieceVariant");
        }

        const contentVariantUpdateResult = await contentVariantsCollection.updateOne(
          {
            contentPieceId: version.contentPieceId,
            variantId: version.variantId
          },
          {
            $set: {
              content: version.content
            }
          }
        );

        if (!contentVariantUpdateResult.matchedCount) throw errors.notFound("contentVariant");

        return;
      }

      const contentPieceUpdateResult = await contentPiecesCollection.updateOne(
        {
          _id: version.contentPieceId,
          workspaceId: ctx.auth.workspaceId
        },
        { $set: version.contentPiece }
      );

      if (!contentPieceUpdateResult.matchedCount) throw errors.notFound("contentPiece");

      const contentUpdateResult = await contentsCollection.updateOne(
        {
          contentPieceId: version.contentPieceId
        },
        { $set: { content: version.content } }
      );

      if (!contentUpdateResult.matchedCount) throw errors.notFound("content");
    })
});

export { versionsRouter, createVersion };
