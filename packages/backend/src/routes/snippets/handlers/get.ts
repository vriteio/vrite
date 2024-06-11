import { z } from "zod";
import { ObjectId } from "mongodb";
import { getSnippetsCollection, getSnippetContentsCollection, snippet } from "#collections";
import { DocJSON, bufferToJSON } from "#lib/content-processing";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { zodId } from "#lib/mongo";

const inputSchema = z.object({
  id: zodId().describe("ID of the snippet"),
  content: z.boolean().describe("Whether to fetch the JSON content").default(false)
});
const outputSchema = snippet.extend({
  content: z.record(z.string(), z.any()).describe("JSON content of the snippet").optional()
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const snippetsCollection = getSnippetsCollection(ctx.db);
  const snippet = await snippetsCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!snippet) throw errors.notFound("snippet");

  let content: DocJSON | null = null;

  if (input.content) {
    const snippetContentsCollection = getSnippetContentsCollection(ctx.db);

    if (!content) {
      const retrievedContent = await snippetContentsCollection.findOne({
        snippetId: new ObjectId(input.id)
      });

      if (retrievedContent && retrievedContent.content) {
        content = bufferToJSON(Buffer.from(retrievedContent.content.buffer));
      } else {
        content = { type: "doc", content: [] };
      }
    }
  }

  return {
    name: snippet.name,
    id: `${snippet._id}`,
    ...(content ? { content } : {})
  };
};

export { inputSchema, outputSchema, handler };
