import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { commentThread, getCommentThreadsCollection, getCommentsCollection } from "#collections";
import { publishCommentEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = commentThread.pick({ fragment: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const commentThreadsCollection = getCommentThreadsCollection(ctx.db);
  const commentsCollection = getCommentsCollection(ctx.db);
  const existingThread = await commentThreadsCollection.findOne({
    fragment: input.fragment,
    workspaceId: ctx.auth.workspaceId
  });

  if (!existingThread) throw errors.notFound("commentThread");

  await commentThreadsCollection.deleteOne({ _id: existingThread._id });
  await commentsCollection.deleteMany({ threadId: existingThread._id });
  publishCommentEvent(ctx, `${existingThread.contentPieceId}`, {
    action: "deleteThread",
    data: {
      id: `${existingThread._id}`,
      fragment: existingThread.fragment
    }
  });
};

export { inputSchema, handler };
