import { ObjectId } from "mongodb";
import { z } from "zod";
import { getSnippetContentsCollection, getSnippetsCollection, snippet } from "#collections";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { publishSnippetEvent } from "#events";

const inputSchema = snippet.pick({ id: true });
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

  await snippetsCollection.deleteOne({ _id: snippet._id });
  await snippetContentsCollection.deleteOne({ snippetId: snippet._id });
  publishSnippetEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "delete",
    userId: `${ctx.auth.userId}`,
    data: { id: `${snippet._id}` }
  });
};

export { handler, inputSchema };
