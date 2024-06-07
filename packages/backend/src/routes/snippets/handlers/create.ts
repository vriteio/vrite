import { ObjectId, Binary } from "mongodb";
import { z } from "zod";
import {
  snippet,
  getSnippetsCollection,
  getSnippetContentsCollection,
  FullSnippet
} from "#collections";
import { AuthenticatedContext } from "#lib/middleware";
import { jsonToBuffer, htmlToJSON } from "#lib/content-processing";
import { UnderscoreID, zodId } from "#lib/mongo";
import { publishSnippetEvent } from "#events";

const inputSchema = snippet.omit({ id: true }).extend({
  content: z.string().describe("HTML content").optional()
});
const outputSchema = z.object({ id: zodId() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const snippetsCollection = getSnippetsCollection(ctx.db);
  const snippetContentsCollection = getSnippetContentsCollection(ctx.db);
  const snippet: UnderscoreID<FullSnippet<ObjectId>> = {
    _id: new ObjectId(),
    workspaceId: ctx.auth.workspaceId,
    name: input.name
  };
  const contentBuffer = jsonToBuffer(htmlToJSON(input.content || "<p></p>"));

  await snippetsCollection.insertOne(snippet);
  await snippetContentsCollection.insertOne({
    _id: new ObjectId(),
    snippetId: snippet._id,
    content: new Binary(contentBuffer)
  });
  publishSnippetEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "create",
    userId: `${ctx.auth.userId}`,
    data: {
      id: `${snippet._id}`,
      name: `${snippet.name}`,
      workspaceId: `${snippet.workspaceId}`
    }
  });

  return { id: `${snippet._id}` };
};

export { handler, inputSchema, outputSchema };
