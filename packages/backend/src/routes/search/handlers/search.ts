import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { contentPiece, getContentPiecesCollection } from "#collections";
import { zodId } from "#lib/mongo";

const inputSchema = z.object({
  query: z.string().describe("Query to search"),
  limit: z.number().optional().describe("Limit of results to return"),
  variantId: zodId().optional().describe("ID of the variant to search in"),
  contentPieceId: zodId().optional().describe("ID of the content piece to search in"),
  contentGroupId: zodId().optional().describe("ID of the content group to search in"),
  byTitle: z.boolean().optional().describe("Whether to search only by the title")
});
const outputSchema = z.array(
  z.object({
    contentPieceId: z.string().describe("ID of the content piece"),
    contentPiece,
    breadcrumb: z
      .array(z.string())
      .describe("Breadcrumb leading to the result fragment (title + headings)"),
    content: z.string().describe("Raw text of the result")
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
