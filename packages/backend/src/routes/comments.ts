import { Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import * as errors from "#lib/errors";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import {
  CommentThread,
  commentThread,
  getCommentThreadsCollection,
  comment,
  getCommentsCollection,
  Comment,
  commentMember,
  CommentWithAdditionalData,
  getWorkspaceMembershipsCollection,
  getUsersCollection,
  CommentMember
} from "#database";

type CommentEvent =
  | { action: "createThread"; data: CommentThread }
  | { action: "resolveThread"; data: Pick<CommentThread, "id" | "fragment" | "resolved"> }
  | { action: "deleteThread"; data: Pick<CommentThread, "id" | "fragment"> }
  | {
      action: "createComment";
      data: Omit<Comment, "memberId"> & { member: CommentMember | null };
    }
  | {
      action: "updateComment";
      data: Pick<Comment, "id" | "content">;
    }
  | {
      action: "deleteComment";
      data: Pick<Comment, "id">;
    };

const fetchCommentsMembers = async (
  db: Db,
  comments: Array<UnderscoreID<Comment<ObjectId>>>
): Promise<Array<CommentWithAdditionalData>> => {
  const memberIds = comments.map((comment) => comment.memberId) || [];
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(db);
  const usersCollection = getUsersCollection(db);
  const memberships = await workspaceMembershipsCollection
    .find({ _id: { $in: memberIds } })
    .toArray();
  const users = await usersCollection
    .find({
      _id: {
        $in: memberships
          .map((membership) => membership.userId)
          .filter((value) => value) as ObjectId[]
      }
    })
    .toArray();

  return comments.map((comment) => {
    const membership = memberships.find(
      (membership) => `${membership._id}` === `${comment.memberId}`
    );
    const user = users.find((user) => {
      if (!membership?.userId) return false;

      return user._id.equals(membership?.userId);
    });

    return {
      ...comment,
      id: `${comment._id}`,
      date: comment.date.toISOString(),
      threadId: `${comment.threadId}`,
      member: null,
      ...(membership &&
        user && {
          member: {
            id: `${membership._id}`,
            profile: {
              id: `${user._id}`,
              email: user.email,
              avatar: user.avatar,
              username: user.username,
              fullName: user.fullName
            }
          }
        })
    };
  });
};
const fetchThreadsFirstComments = async (
  db: Db,
  threads: Array<UnderscoreID<CommentThread<ObjectId>>>
): Promise<Array<CommentWithAdditionalData>> => {
  const commentIds = threads.map((thread) => thread.comments[0] || null).filter((value) => value);
  const commentsCollection = getCommentsCollection(db);
  const comments = await commentsCollection.find({ _id: { $in: commentIds } }).toArray();

  return fetchCommentsMembers(db, comments);
};
const authenticatedProcedure = procedure.use(isAuthenticated);
const publishEvent = createEventPublisher<CommentEvent>((contentPieceId) => {
  return `comments:${contentPieceId}`;
});
const commentsRouter = router({
  getThread: authenticatedProcedure
    .input(z.object({ fragment: z.string() }))
    .output(commentThread.omit({ comments: true }))
    .query(async ({ ctx, input }) => {
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
        contentPieceId: `${thread.contentPieceId}`
      };
    }),
  listThreads: authenticatedProcedure
    .input(z.object({ contentPieceId: zodId() }))
    .output(
      z.array(
        commentThread.omit({ comments: true }).extend({
          firstComment: comment
            .omit({ memberId: true })
            .extend({
              member: commentMember.or(z.null())
            })
            .or(z.null())
        })
      )
    )
    .query(async ({ ctx, input }) => {
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
    }),
  listComments: authenticatedProcedure
    .input(z.object({ fragment: z.string() }))
    .output(
      z.array(comment.omit({ memberId: true }).extend({ member: commentMember.or(z.null()) }))
    )
    .query(async ({ ctx, input }) => {
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
    }),
  createThread: authenticatedProcedure
    .input(z.object({ contentPieceId: zodId(), fragment: z.string() }))
    .output(commentThread.pick({ id: true }))
    .mutation(async ({ input, ctx }) => {
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

      publishEvent(ctx, `${input.contentPieceId}`, {
        action: "createThread",
        data: {
          ...thread,
          contentPieceId: `${thread.contentPieceId}`,
          date: thread.date.toISOString(),
          id: `${thread._id}`
        }
      });

      return { id: `${thread._id}` };
    }),
  resolveThread: authenticatedProcedure
    .input(z.object({ fragment: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
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

      publishEvent(ctx, `${existingThread.contentPieceId}`, {
        action: "resolveThread",
        data: {
          id: `${existingThread._id}`,
          fragment: existingThread.fragment,
          resolved: true
        }
      });
    }),
  createComment: authenticatedProcedure
    .input(comment.omit({ id: true, date: true, threadId: true }).extend({ fragment: z.string() }))
    .output(comment.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
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
        workspaceId: ctx.auth.workspaceId
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

      publishEvent(ctx, `${existingThread.contentPieceId}`, {
        action: "createComment",
        data: (await fetchCommentsMembers(ctx.db, [comment]))[0]
      });

      return { id: `${comment._id}` };
    }),
  updateComment: authenticatedProcedure
    .input(comment.pick({ id: true, content: true }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
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

      await commentsCollection.updateOne(
        { _id: existingComment._id },
        { $set: { content: input.content } }
      );

      publishEvent(ctx, `${existingThread.contentPieceId}`, {
        action: "updateComment",
        data: {
          content: input.content,
          id: `${existingComment._id}`
        }
      });
    }),
  deleteComment: authenticatedProcedure
    .input(comment.pick({ id: true }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
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

      publishEvent(ctx, `${existingThread.contentPieceId}`, {
        action: "deleteComment",
        data: {
          id: `${existingComment._id}`
        }
      });
    }),
  deleteThread: authenticatedProcedure
    .input(commentThread.pick({ fragment: true }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const commentThreadsCollection = getCommentThreadsCollection(ctx.db);
      const commentsCollection = getCommentsCollection(ctx.db);
      const existingThread = await commentThreadsCollection.findOne({
        fragment: input.fragment,
        workspaceId: ctx.auth.workspaceId
      });

      if (!existingThread) throw errors.notFound("commentThread");

      await commentThreadsCollection.deleteOne({ _id: existingThread._id });
      await commentsCollection.deleteMany({ threadId: existingThread._id });

      publishEvent(ctx, `${existingThread.contentPieceId}`, {
        action: "deleteThread",
        data: {
          id: `${existingThread._id}`,
          fragment: existingThread.fragment
        }
      });
    }),
  changes: authenticatedProcedure
    .input(z.object({ contentPieceId: zodId() }))
    .subscription(({ ctx, input }) => {
      return createEventSubscription<CommentEvent>(ctx, `comments:${input.contentPieceId}`);
    })
});

export { commentsRouter };
