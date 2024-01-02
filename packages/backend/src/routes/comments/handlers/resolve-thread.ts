import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { getCommentThreadsCollection } from "#collections";
import { publishCommentEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = z.object({ fragment: z.string() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const commentThreadsCollection = getCommentThreadsCollection(ctx.db);
  const existingThread = await commentThreadsCollection.findOne({
    workspaceId: ctx.auth.workspaceId,
    fragment: input.fragment
  });

  if (!existingThread) throw errors.notFound("commentThread");

  await commentThreadsCollection.updateOne(
    {
      workspaceId: ctx.auth.workspaceId,
      fragment: input.fragment
    },
    {
      $set: { resolved: true }
    }
  );
  publishCommentEvent(ctx, `${existingThread.contentPieceId}`, {
    action: "resolveThread",
    data: {
      id: `${existingThread._id}`,
      fragment: existingThread.fragment,
      resolved: true
    }
  });
};

export { inputSchema, handler };
