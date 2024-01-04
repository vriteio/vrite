import { getVariantDetails, mergeVariantData } from "../utils";
import { ObjectId, Binary } from "mongodb";
import { convert as convertToSlug } from "url-slug";
import { z } from "zod";
import {
  contentPiece,
  getContentPiecesCollection,
  getContentPieceVariantsCollection,
  getContentGroupsCollection,
  getContentsCollection,
  getContentVariantsCollection,
  FullContentPiece
} from "#collections";
import { jsonToBuffer, htmlToJSON } from "#lib/content-processing";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID, zodId } from "#lib/mongo";
import { publishContentPieceEvent } from "#events";
import {
  fetchContentPieceTags,
  fetchContentPieceMembers,
  getCanonicalLinkFromPattern
} from "#lib/utils";

declare module "fastify" {
  interface RouteCallbacks {
    "contentPieces.update": {
      ctx: AuthenticatedContext;
      data: {
        contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
        updatedContentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
        contentBuffer: Buffer | null;
        variantId: ObjectId | null;
      };
    };
  }
}

const inputSchema = contentPiece
  .extend({
    coverWidth: z.string(),
    content: z.string(),
    variant: zodId()
      .or(
        z
          .string()
          .min(1)
          .max(20)
          .regex(/^[a-z0-9_]*$/)
      )
      .optional()
  })
  .partial()
  .required({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const {
    id,
    variant,
    content: updatedContent,
    contentGroupId: updatedContentGroupId,
    customData: updatedCustomData,
    tags: updatedTags,
    members: updatedMembers,
    date: updatedDate,
    ...update
  } = input;
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentPieceVariantsCollection = getContentPieceVariantsCollection(ctx.db);
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const contentVariantsCollection = getContentVariantsCollection(ctx.db);
  const { variantId, variantKey } = await getVariantDetails(ctx.db, variant);
  const baseContentPiece = await contentPiecesCollection.findOne({
    _id: new ObjectId(id)
  });

  if (!baseContentPiece) throw errors.notFound("contentPiece");

  let contentPiece = baseContentPiece;

  if (variantId) {
    const contentPieceVariant = await contentPieceVariantsCollection.findOne({
      contentPieceId: new ObjectId(id),
      workspaceId: ctx.auth.workspaceId,
      variantId
    });

    if (contentPieceVariant) {
      contentPiece = mergeVariantData(contentPiece, contentPieceVariant);
    }
  }

  const contentPieceUpdates: Partial<UnderscoreID<FullContentPiece<ObjectId>>> = {
    ...update
  };

  if (typeof update.slug !== "undefined") {
    if (update.slug) {
      contentPieceUpdates.slug = update.slug
        .split("/")
        .map((slugPart) => convertToSlug(slugPart))
        .join("/");
    } else {
      contentPieceUpdates.slug = convertToSlug(update.title || contentPiece.title);
    }
  } else if (convertToSlug(contentPiece.title) === contentPiece.slug) {
    contentPieceUpdates.slug = convertToSlug(update.title || contentPiece.title);
  }

  if (updatedTags) contentPieceUpdates.tags = updatedTags.map((tag) => new ObjectId(tag));

  if (updatedMembers) {
    contentPieceUpdates.members = updatedMembers.map((member) => new ObjectId(member));
  }

  if (updatedDate) contentPieceUpdates.date = new Date(updatedDate);
  if (updatedDate === null) contentPieceUpdates.date = null;

  if (updatedContentGroupId) {
    const newContentGroup = await contentGroupsCollection.findOne({
      _id: new ObjectId(updatedContentGroupId)
    });

    if (!newContentGroup) throw errors.notFound("contentGroup");

    contentPieceUpdates.contentGroupId = newContentGroup._id;
  }

  if (updatedCustomData) {
    const { $schema, ...customData } = updatedCustomData;

    contentPieceUpdates.customData = customData;
  }

  const newContentPiece = { ...contentPiece, ...contentPieceUpdates };

  if (variantId) {
    await contentPieceVariantsCollection.updateOne(
      { contentPieceId: new ObjectId(id), variantId },
      { $set: { ...contentPieceUpdates, workspaceId: ctx.auth.workspaceId } },
      { upsert: true }
    );
  } else {
    await contentPiecesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: contentPieceUpdates }
    );
  }

  let contentBuffer: Buffer | null = null;

  if (updatedContent) {
    contentBuffer = jsonToBuffer(htmlToJSON(updatedContent));

    if (variantId) {
      await contentVariantsCollection.updateOne(
        {
          contentPieceId: contentPiece._id,
          variantId
        },
        {
          $set: {
            content: new Binary(contentBuffer),
            workspaceId: ctx.auth.workspaceId
          }
        }
      );
    } else {
      await contentsCollection.updateOne(
        {
          contentPieceId: contentPiece._id
        },
        {
          $set: {
            content: new Binary(contentBuffer)
          }
        }
      );
    }
  }

  const tags = await fetchContentPieceTags(ctx.db, newContentPiece);
  const members = await fetchContentPieceMembers(ctx.db, newContentPiece);

  publishContentPieceEvent(ctx, `${newContentPiece.contentGroupId}`, {
    action: "update",
    userId: `${ctx.auth.userId}`,
    data: {
      ...newContentPiece,
      ...(typeof newContentPiece.canonicalLink !== "string" && {
        canonicalLink: await getCanonicalLinkFromPattern(ctx, {
          slug: newContentPiece.slug,
          variant: variantKey
        })
      }),
      id: `${newContentPiece._id}`,
      contentGroupId: `${newContentPiece.contentGroupId}`,
      workspaceId: `${newContentPiece.workspaceId}`,
      date: newContentPiece.date?.toISOString() || null,
      tags,
      members,
      ...(variantId ? { variantId } : {})
    }
  });
  ctx.fastify.routeCallbacks.run("contentPieces.update", ctx, {
    updatedContentPiece: newContentPiece,
    variantId,
    contentPiece,
    contentBuffer
  });
};

export { handler, inputSchema };
