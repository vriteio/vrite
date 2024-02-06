import { fetchCommentsMembers } from "../utils";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { comment, getCommentsCollection, getCommentThreadsCollection } from "#collections";
import { publishCommentEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = comment
  .omit({ id: true, date: true, threadId: true })
  .extend({ fragment: z.string() });
const outputSchema = comment.pick({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const commentsCollection = getCommentsCollection(ctx.db);
  const commentThreadsCollection = getCommentThreadsCollection(ctx.db);
  const existingThread = await commentThreadsCollection.findOne({
    fragment: input.fragment,
    workspaceId: ctx.auth.workspaceId
  });

  if (!existingThread) throw errors.notFound("commentThread");

  const comment = {
    ...input,
    _id: new ObjectId(),
    date: new Date(),
    memberId: new ObjectId(input.memberId),
    threadId: existingThread._id,
    workspaceId: ctx.auth.workspaceId,
    contentPieceId: new ObjectId(input.contentPieceId),
    variantId: input.variantId ? new ObjectId(input.variantId) : undefined
  };

  await commentsCollection.insertOne(comment);
  await commentThreadsCollection.updateOne(
    {
      _id: existingThread._id
    },
    {
      $push: { comments: comment._id }
    }
  );
  publishCommentEvent(ctx, `${existingThread.contentPieceId}`, {
    action: "createComment",
    data: (await fetchCommentsMembers(ctx.db, [comment]))[0]
  });

  return { id: `${comment._id}` };
};

export { inputSchema, outputSchema, handler };
