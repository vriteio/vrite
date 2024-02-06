import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { commentThread, getCommentThreadsCollection } from "#collections";
import { publishCommentEvent } from "#events";
import { zodId } from "#lib/mongo";

const inputSchema = z.object({ contentPieceId: zodId(), fragment: z.string() });
const outputSchema = commentThread.pick({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const commentThreadsCollection = getCommentThreadsCollection(ctx.db);
  const thread = {
    _id: new ObjectId(),
    comments: [],
    date: new Date(),
    workspaceId: ctx.auth.workspaceId,
    contentPieceId: new ObjectId(input.contentPieceId),
    fragment: input.fragment,
    resolved: false
  };

  await commentThreadsCollection.insertOne(thread);
  publishCommentEvent(ctx, `${input.contentPieceId}`, {
    action: "createThread",
    data: {
      ...thread,
      contentPieceId: `${thread.contentPieceId}`,
      date: thread.date.toISOString(),
      id: `${thread._id}`
    }
  });

  return { id: `${thread._id}` };
};

export { inputSchema, outputSchema, handler };
