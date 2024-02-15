import { fetchCommentsMembers } from "../utils";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  comment,
  commentMember,
  getCommentThreadsCollection,
  Comment,
  getCommentsCollection,
  commentThread
} from "#collections";
import { errors } from "#lib/errors";
import { UnderscoreID } from "#lib/mongo";

const inputSchema = commentThread.pick({ fragment: true });
const outputSchema = z.array(
  comment.omit({ memberId: true }).extend({
    member: commentMember.describe("Workspace member who created the comment").or(z.null())
  })
);
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

  const commentsCollection = getCommentsCollection(ctx.db);
  const comments = await commentsCollection
    .find({
      _id: { $in: thread.comments },
      workspaceId: ctx.auth.workspaceId
    })
    .toArray();

  return fetchCommentsMembers(
    ctx.db,
    thread.comments
      .map((id) => {
        const comment = comments.find((comment) => `${comment._id}` === `${id}`);

        if (!comment) return null;

        return comment;
      })
      .filter((value) => value) as Array<UnderscoreID<Comment<ObjectId>>>
  );
};

export { inputSchema, outputSchema, handler };
