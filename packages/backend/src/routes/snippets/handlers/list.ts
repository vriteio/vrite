import { z } from "zod";
import { getSnippetContentsCollection, getSnippetsCollection, snippet } from "#collections";
import { AuthenticatedContext } from "#lib/middleware";
import { DocJSON, bufferToJSON } from "#lib/content-processing";

const inputSchema = z
  .object({
    content: z.boolean().describe("Whether to fetch the JSON content").default(false)
  })
  .optional();
const outputSchema = z.array(
  snippet.extend({
    content: z.record(z.string(), z.any()).describe("JSON content of the snippet").optional()
  })
);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const snippetsCollection = getSnippetsCollection(ctx.db);
  const snippets = await snippetsCollection
    .find({
      workspaceId: ctx.auth.workspaceId
    })
    .sort({ _id: -1 })
    .toArray();
  const contents = new Map<string, DocJSON>();

  if (input?.content) {
    const snippetContentsCollection = getSnippetContentsCollection(ctx.db);
    const snippetIds = snippets.map((snippet) => snippet._id);
    const snippetContents = await snippetContentsCollection
      .find({
        snippetId: { $in: snippetIds }
      })
      .toArray();

    snippetContents.forEach(({ snippetId, content }) => {
      if (content) {
        contents.set(`${snippetId}`, bufferToJSON(Buffer.from(content.buffer)));
      }
    });
  }

  return snippets.map((snippet) => {
    const content = contents.get(`${snippet._id}`);

    return {
      id: `${snippet._id}`,
      name: snippet.name,
      ...(input?.content && content ? { content } : {})
    };
  });
};

export { inputSchema, outputSchema, handler };
