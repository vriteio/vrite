import { ObjectId, Binary } from "mongodb";
import { z } from "zod";
import {
  snippet,
  getSnippetsCollection,
  getSnippetContentsCollection,
  FullSnippet
} from "#collections";
import { jsonToBuffer, htmlToJSON } from "#lib/content-processing";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID } from "#lib/mongo";
import { publishSnippetEvent } from "#events";

const inputSchema = snippet
  .extend({
    content: z.string().describe("HTML content")
  })
  .partial()
  .required({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const snippetsCollection = getSnippetsCollection(ctx.db);
  const snippetContentsCollection = getSnippetContentsCollection(ctx.db);
  const snippet = await snippetsCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!snippet) throw errors.notFound("snippet");

  const snippetUpdates: Partial<UnderscoreID<FullSnippet<ObjectId>>> = {
    ...(input.name && { name: input.name })
  };
  const newSnippet = { ...snippet, ...snippetUpdates };

  await snippetsCollection.updateOne({ _id: snippet._id }, { $set: snippetUpdates });

  let contentBuffer: Buffer | null = null;

  if (input.content) {
    contentBuffer = jsonToBuffer(htmlToJSON(input.content));
    await snippetContentsCollection.updateOne(
      {
        snippetId: snippet._id
      },
      {
        $set: {
          content: new Binary(contentBuffer)
        }
      }
    );
  }

  publishSnippetEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    userId: `${ctx.auth.userId}`,
    data: {
      ...newSnippet,
      id: `${newSnippet._id}`,
      workspaceId: `${newSnippet.workspaceId}`
    }
  });
};

export { handler, inputSchema };
