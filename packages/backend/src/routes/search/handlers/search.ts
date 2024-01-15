import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { contentPiece, getContentPiecesCollection } from "#collections";
import { zodId } from "#lib/mongo";

const inputSchema = z.object({
  query: z.string(),
  limit: z.number().optional(),
  variantId: zodId().optional(),
  contentPieceId: zodId().optional(),
  contentGroupId: zodId().optional(),
  byTitle: z.boolean().optional()
});
const outputSchema = z.array(
  z.object({
    contentPieceId: z.string(),
    contentPiece,
    breadcrumb: z.array(z.string()),
    content: z.string()
  })
);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const results = await ctx.fastify.search.search({
    query: input.query,
    workspaceId: ctx.auth.workspaceId,
    limit: input.limit || 8,
    variantId: input.variantId,
    contentPieceId: input.contentPieceId,
    contentGroupId: input.contentGroupId,
    byTitle: input.byTitle
  });
  const processedResults = results.data.Get.Content.map(({ _additional, ...result }) => result);
  const contentPieces = await contentPiecesCollection
    .find({
      _id: { $in: processedResults.map(({ contentPieceId }) => new ObjectId(contentPieceId)) }
    })
    .toArray();

  return processedResults.map(({ contentPieceId, content, breadcrumb }) => {
    const { _id, date, contentGroupId, tags, members, ...contentPiece } = contentPieces.find(
      ({ _id }) => _id.toString() === contentPieceId
    )!;

    return {
      contentPieceId,
      breadcrumb,
      content,
      contentPiece: {
        id: `${_id}`,
        contentGroupId: `${contentGroupId}`,
        ...contentPiece,
        ...(date && { date: date.toISOString() }),
        ...(tags && { tags: tags.map((tagId) => `${tagId}`) }),
        ...(members && { members: members.map((members) => `${members}`) })
      }
    };
  });
};

export { inputSchema, outputSchema, handler };
