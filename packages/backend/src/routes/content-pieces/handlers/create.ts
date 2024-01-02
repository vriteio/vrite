import { LexoRank } from "lexorank";
import { ObjectId, Binary } from "mongodb";
import { convert as convertToSlug } from "url-slug";
import { z } from "zod";
import {
  contentPiece,
  getContentPiecesCollection,
  getContentsCollection,
  getContentGroupsCollection,
  FullContentPiece
} from "#collections";
import { AuthenticatedContext } from "#lib/middleware";
import { jsonToBuffer, htmlToJSON } from "#lib/content-processing";
import { errors } from "#lib/errors";
import { UnderscoreID, zodId } from "#lib/mongo";
import { publishContentPieceEvent } from "#events";
import {
  fetchContentPieceTags,
  fetchContentPieceMembers,
  getCanonicalLinkFromPattern
} from "#lib/utils";

declare module "fastify" {
  interface RouteCallbacks {
    "contentPieces.create": {
      ctx: AuthenticatedContext;
      data: {
        contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
        contentBuffer: Buffer;
      };
    };
  }
}

const inputSchema = contentPiece.omit({ id: true, slug: true }).extend({
  content: z.string().optional(),
  referenceId: zodId().optional(),
  slug: z.string().optional()
});
const outputSchema = z.object({ id: zodId() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const { referenceId, contentGroupId, customData, content, ...create } = input;
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentGroup = await contentGroupsCollection.findOne({
    _id: new ObjectId(contentGroupId)
  });
  const contentPiece: UnderscoreID<FullContentPiece<ObjectId>> = {
    ...create,
    _id: new ObjectId(),
    workspaceId: ctx.auth.workspaceId,
    contentGroupId: new ObjectId(contentGroupId),
    date: create.date ? new Date(create.date) : undefined,
    tags: create.tags?.map((tag) => new ObjectId(tag)) || [],
    members: create.members?.map((member) => new ObjectId(member)) || [],
    order: LexoRank.min().toString(),
    slug: create.slug || convertToSlug(create.title)
  };

  if (!contentGroup) throw errors.notFound("contentGroup");

  let referenceContentPiece: UnderscoreID<FullContentPiece<ObjectId>> | null = null;

  if (referenceId) {
    referenceContentPiece = await contentPiecesCollection.findOne({
      _id: new ObjectId(referenceId)
    });

    if (!referenceContentPiece) {
      throw errors.notFound("contentPiece", { contentPiece: "reference" });
    }
  }

  if (referenceContentPiece) {
    contentPiece.order = LexoRank.parse(referenceContentPiece.order).genNext().toString();
  } else {
    const [lastContentPiece] = await contentPiecesCollection
      .find({ contentGroupId: contentPiece.contentGroupId })
      .sort({ order: -1 })
      .limit(1)
      .toArray();

    if (lastContentPiece) {
      contentPiece.order = LexoRank.parse(lastContentPiece.order).genNext().toString();
    } else {
      contentPiece.order = LexoRank.min().toString();
    }
  }

  const contentBuffer = jsonToBuffer(htmlToJSON(content || "<p></p>"));

  await contentPiecesCollection.insertOne(contentPiece);
  await contentsCollection.insertOne({
    _id: new ObjectId(),
    contentPieceId: contentPiece._id,
    content: new Binary(contentBuffer)
  });

  const tags = await fetchContentPieceTags(ctx.db, contentPiece);
  const members = await fetchContentPieceMembers(ctx.db, contentPiece);

  publishContentPieceEvent(ctx, `${contentPiece.contentGroupId}`, {
    action: "create",
    userId: `${ctx.auth.userId}`,
    data: {
      ...contentPiece,
      ...(typeof contentPiece.canonicalLink !== "string" && {
        canonicalLink: await getCanonicalLinkFromPattern(ctx, { slug: contentPiece.slug })
      }),
      id: `${contentPiece._id}`,
      workspaceId: `${contentPiece.workspaceId}`,
      date: contentPiece.date?.toISOString(),
      contentGroupId: `${contentPiece.contentGroupId}`,
      tags,
      members
    }
  });
  ctx.fastify.routeCallbacks.run("contentPieces.create", ctx, { contentPiece, contentBuffer });

  return { id: `${contentPiece._id}` };
};

export { handler, inputSchema, outputSchema };
