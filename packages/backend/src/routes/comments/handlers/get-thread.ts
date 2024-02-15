import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { commentThread, getCommentThreadsCollection } from "#collections";
import { errors } from "#lib/errors";

const inputSchema = commentThread.pick({ fragment: true });
const outputSchema = commentThread.omit({ comments: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const commentThreadsCollection = getCommentThreadsCollection(ctx.db);
  const thread = await commentThreadsCollection.findOne({
    fragment: input.fragment,
    workspaceId: ctx.auth.workspaceId
  });

  if (!thread) throw errors.notFound("commentThread");

  return {
    ...thread,
    id: `${thread._id}`,
    date: thread.date.toISOString(),
    contentPieceId: `${thread.contentPieceId}`,
    variantId: thread.variantId ? `${thread.variantId}` : undefined
  };
};

export { inputSchema, outputSchema, handler };
