import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { comment, getCommentsCollection, getCommentThreadsCollection } from "#collections";
import { publishCommentEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = comment.pick({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const commentsCollection = getCommentsCollection(ctx.db);
  const commentThreadsCollection = getCommentThreadsCollection(ctx.db);
  const existingComment = await commentsCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!existingComment) throw errors.notFound("comment");

  const existingThread = await commentThreadsCollection.findOne({
    _id: existingComment.threadId,
    workspaceId: ctx.auth.workspaceId
  });

  if (!existingThread) throw errors.notFound("commentThread");

  await commentsCollection.deleteOne({ _id: existingComment._id });
  await commentThreadsCollection.updateOne(
    { _id: existingThread._id },
    { $pull: { comments: existingComment._id } }
  );
  publishCommentEvent(ctx, `${existingThread.contentPieceId}`, {
    action: "deleteComment",
    data: {
      id: `${existingComment._id}`,
      threadId: `${existingComment.threadId}`
    }
  });
};

export { inputSchema, handler };
