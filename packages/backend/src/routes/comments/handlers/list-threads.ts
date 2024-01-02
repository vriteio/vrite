import { fetchThreadsFirstComments } from "../utils";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  commentThread,
  comment,
  commentMember,
  getCommentThreadsCollection,
  CommentThread,
  CommentWithAdditionalData
} from "#collections";
import { zodId } from "#lib/mongo";

const inputSchema = z.object({ contentPieceId: zodId() });
const outputSchema = z.array(
  commentThread.omit({ comments: true }).extend({
    firstComment: comment
      .omit({ memberId: true })
      .extend({
        member: commentMember.or(z.null())
      })
      .or(z.null())
  })
);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const commentThreadsCollection = getCommentThreadsCollection(ctx.db);
  const threads = await commentThreadsCollection
    .find({
      contentPieceId: new ObjectId(input.contentPieceId),
      workspaceId: ctx.auth.workspaceId
    })
    .toArray();
  const firstComments = await fetchThreadsFirstComments(ctx.db, threads);

  return threads
    .map((thread) => {
      const firstComment =
        firstComments.find((comment) => {
          return `${comment.id}` === `${thread.comments[0]}`;
        }) || null;

      return {
        ...thread,
        id: `${thread._id}`,
        date: thread.date.toISOString(),
        contentPieceId: `${thread.contentPieceId}`,
        firstComment
      };
    })
    .filter((thread) => thread && !thread.resolved) as Array<
    Omit<CommentThread, "comments"> & { firstComment: CommentWithAdditionalData }
  >;
};

export { inputSchema, outputSchema, handler };
