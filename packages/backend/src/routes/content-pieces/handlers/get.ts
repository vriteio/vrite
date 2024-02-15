import { getVariantDetails } from "../utils";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { convert as convertToText } from "html-to-text";
import {
  contentPiece,
  tag,
  contentPieceMember,
  getContentPiecesCollection,
  getContentPieceVariantsCollection,
  getContentsCollection,
  getContentVariantsCollection
} from "#collections";
import { DocJSON, bufferToJSON } from "#lib/content-processing";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { zodId } from "#lib/mongo";
import {
  fetchContentPieceTags,
  fetchContentPieceMembers,
  getCanonicalLinkFromPattern
} from "#lib/utils";

const inputSchema = z.object({
  id: zodId().describe("ID of the content piece"),
  content: z.boolean().describe("Whether to fetch the JSON content").default(false),
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
  description: z.enum(["html", "text"]).describe("Format of the description").default("html")
});
const outputSchema = contentPiece.omit({ tags: true }).extend({
  tags: z.array(tag).describe("Tags assigned to the content piece"),
  members: z.array(contentPieceMember).describe("Members assigned to the content piece"),
  slug: z.string().describe("Slug of the content piece"),
  coverWidth: z.string().describe("Width of the cover image").optional(),
  content: z.record(z.string(), z.any()).describe("JSON content of the piece").optional()
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentPieceVariantsCollection = getContentPieceVariantsCollection(ctx.db);
  const { variantId, variantKey } = await getVariantDetails(ctx.db, input.variant);
  const baseContentPiece = await contentPiecesCollection.findOne({
    _id: new ObjectId(input.id)
  });

  if (!baseContentPiece) throw errors.notFound("contentPiece");

  let contentPiece = baseContentPiece;

  if (variantId) {
    const contentPieceVariant = await contentPieceVariantsCollection.findOne({
      contentPieceId: new ObjectId(input.id),
      workspaceId: ctx.auth.workspaceId,
      variantId
    });

    if (contentPieceVariant) {
      contentPiece = {
        ...contentPiece,
        ...contentPieceVariant
      };
    }
  }

  let content: DocJSON | null = null;

  if (input.content) {
    const contentsCollection = getContentsCollection(ctx.db);
    const contentVariantsCollection = getContentVariantsCollection(ctx.db);

    if (variantId) {
      const contentVariant = await contentVariantsCollection.findOne({
        contentPieceId: new ObjectId(input.id),
        variantId
      });

      if (contentVariant && contentVariant.content) {
        content = bufferToJSON(Buffer.from(contentVariant.content.buffer));
      }
    }

    if (!content) {
      const retrievedContent = await contentsCollection.findOne({
        contentPieceId: new ObjectId(input.id)
      });

      if (retrievedContent && retrievedContent.content) {
        content = bufferToJSON(Buffer.from(retrievedContent.content.buffer));
      } else {
        content = { type: "doc", content: [] };
      }
    }
  }

  const tags = await fetchContentPieceTags(ctx.db, contentPiece);
  const members = await fetchContentPieceMembers(ctx.db, contentPiece);
  const getDescription = (): string => {
    if (input.description === "html") {
      return contentPiece.description || "";
    }

    return convertToText(contentPiece.description || "", { wordwrap: false });
  };

  return {
    ...contentPiece,
    ...(typeof contentPiece.canonicalLink !== "string" && {
      canonicalLink: await getCanonicalLinkFromPattern(ctx, {
        slug: contentPiece.slug,
        variant: variantKey
      })
    }),
    id: `${contentPiece._id}`,
    description: getDescription(),
    contentGroupId: `${contentPiece.contentGroupId}`,
    date: contentPiece.date?.toISOString(),
    tags,
    members,
    ...(content ? { content } : {})
  };
};

export { inputSchema, outputSchema, handler };
