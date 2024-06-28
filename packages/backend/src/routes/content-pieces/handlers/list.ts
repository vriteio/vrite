import { getVariantDetails } from "../utils";
import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  getContentPiecesCollection,
  getContentPieceVariantsCollection,
  contentPieceMember,
  tag,
  contentPiece,
  getContentsCollection,
  getContentVariantsCollection
} from "#collections";
import { AuthenticatedContext } from "#lib/middleware";
import { zodId } from "#lib/mongo";
import {
  fetchEntryMembers,
  fetchContentPieceTags,
  getCanonicalLinkFromPattern,
  stringToRegex
} from "#lib/utils";
import { DocJSON, bufferToJSON } from "#lib/content-processing";

const inputSchema = z.object({
  content: z.boolean().describe("Whether to fetch the JSON content").default(false),
  contentGroupId: zodId()
    .describe("ID of the content group which contains the content pieces")
    .optional(),
  variant: zodId()
    .describe("ID or key of the variant")
    .or(
      z
        .string()
        .min(1)
        .max(20)
        .regex(/^[a-z0-9_]*$/)
    )
    .optional(),
  slug: z.string().describe("Slug of the content piece").optional(),
  tagId: zodId().describe("ID of the tag").optional(),
  lastOrder: z
    .string()
    .describe("Last order identifier to start fetching content pieces from")
    .optional(),
  perPage: z.number().describe("Number of content pieces per page").default(20),
  page: z.number().describe("Page number to fetch").default(1)
});
const outputSchema = z.array(
  contentPiece.omit({ tags: true }).extend({
    slug: z.string().describe("Slug of the content piece"),
    tags: z.array(tag).describe("Tags assigned to the content piece"),
    coverWidth: z.string().describe("Width of the cover image").optional(),
    members: z.array(contentPieceMember),
    order: z.string(),
    content: z.record(z.string(), z.any()).describe("JSON content of the piece").optional()
  })
);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentPieceVariantsCollection = getContentPieceVariantsCollection(ctx.db);
  const { variantId, variantKey } = await getVariantDetails(ctx.db, input.variant);
  const cursor = contentPiecesCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      ...(input.contentGroupId ? { contentGroupId: new ObjectId(input.contentGroupId) } : {}),
      ...(input.tagId ? { tags: new ObjectId(input.tagId) } : {}),
      ...(input.slug ? { slug: stringToRegex(input.slug) } : {}),
      ...(input.lastOrder ? { order: { $lt: input.lastOrder } } : {})
    })
    .sort({ order: -1 });

  if (!input.lastOrder) {
    cursor.skip((input.page - 1) * input.perPage);
  }

  let contentPieces = await cursor.limit(input.perPage).toArray();

  if (variantId) {
    const contentPieceVariants = await contentPieceVariantsCollection
      .find({
        contentPieceId: { $in: contentPieces.map((contentPiece) => contentPiece._id) },
        workspaceId: ctx.auth.workspaceId,
        variantId
      })
      .toArray();

    contentPieces = contentPieces.map((contentPiece) => {
      const contentPieceVariant = contentPieceVariants.find((contentPieceVariant) => {
        return `${contentPieceVariant.contentPieceId}` === `${contentPiece._id}`;
      });

      if (contentPieceVariant) {
        const { _id, contentPieceId, variantId, workspaceId, ...variantData } = contentPieceVariant;

        return {
          ...contentPiece,
          ...variantData
        };
      }

      return contentPiece;
    });
  }

  const contents = new Map<string, DocJSON>();

  if (input.content) {
    const contentsCollection = getContentsCollection(ctx.db);
    const contentVariantsCollection = getContentVariantsCollection(ctx.db);
    const contentPieceIds = contentPieces.map((contentPiece) => `${contentPiece._id}`);

    if (variantId) {
      const contentVariants = await contentVariantsCollection
        .find({
          contentPieceId: { $in: contentPieceIds.map((id) => new ObjectId(id)) },
          variantId
        })
        .toArray();

      contentVariants.forEach(({ contentPieceId, content }) => {
        if (content) {
          contents.set(`${contentPieceId}`, bufferToJSON(Buffer.from(content.buffer)));
          contentPieceIds.splice(contentPieceIds.indexOf(`${contentPieceId}`), 1);
        }
      });
    }

    if (contentPieceIds.length > 0) {
      const retrievedContents = await contentsCollection
        .find({
          contentPieceId: { $in: contentPieceIds.map((id) => new ObjectId(id)) }
        })
        .toArray();

      retrievedContents.forEach(({ contentPieceId, content }) => {
        if (content) {
          contents.set(`${contentPieceId}`, bufferToJSON(Buffer.from(content.buffer)));
        } else {
          contents.set(`${contentPieceId}`, { type: "doc", content: [] });
        }
      });
    }
  }

  return Promise.all(
    contentPieces.map(async (contentPiece) => {
      const tags = await fetchContentPieceTags(ctx.db, contentPiece);
      const members = await fetchEntryMembers(ctx.db, contentPiece);
      const content = contents.get(`${contentPiece._id}`);

      return {
        ...contentPiece,
        ...(typeof contentPiece.canonicalLink !== "string" && {
          canonicalLink: await getCanonicalLinkFromPattern(ctx, {
            slug: contentPiece.slug,
            variant: variantKey
          })
        }),
        id: `${contentPiece._id}`,
        contentGroupId: `${contentPiece.contentGroupId}`,
        workspaceId: `${contentPiece.workspaceId}`,
        date: contentPiece.date?.toISOString(),
        tags,
        members,
        ...(input.content && content ? { content } : {})
      };
    })
  );
};

export { inputSchema, outputSchema, handler };
