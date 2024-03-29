import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { errors } from "#lib/errors";
import { zodId } from "#lib/mongo";

type OutgoingHttpHeader = number | string | string[];
type OutgoingHttpHeaders = NodeJS.Dict<OutgoingHttpHeader>;

const inputSchema = z.object({
  query: z.string().describe("Query to ask"),
  variantId: zodId().describe("ID of the variant to search for references in").optional(),
  contentGroupId: zodId()
    .describe("ID of the content group to search for references in")
    .optional(),
  contentPieceId: zodId().describe("ID of the content piece to search for references in").optional()
});
const outputSchema = z.any().describe("SSE stream of output");
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  try {
    const responseStream = await ctx.fastify.search.ask({
      question: input.query,
      workspaceId: ctx.auth.workspaceId,
      variantId: input.variantId,
      contentGroupId: input.contentGroupId,
      contentPieceId: input.contentPieceId
    });

    if (!responseStream) throw errors.serverError();

    ctx.res.raw.writeHead(200, {
      ...(ctx.res.getHeaders() as OutgoingHttpHeaders),
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "connection": "keep-alive"
    });

    for await (const part of responseStream) {
      const content = part.choices[0].delta.content || "";

      if (content) {
        ctx.res.raw.write(`data: ${encodeURIComponent(content)}`);
        ctx.res.raw.write("\n\n");
      }
    }

    ctx.res.raw.end();
  } catch (error) {
    ctx.res.raw.writeHead(500, {
      ...(ctx.res.getHeaders() as OutgoingHttpHeaders),
      "content-type": "application/json",
      "cache-control": "no-cache",
      "connection": "keep-alive"
    });
    throw errors.serverError();
  }
};

export { inputSchema, outputSchema, handler };
