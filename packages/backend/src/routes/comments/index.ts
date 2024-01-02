import * as getThread from "./handlers/get-thread";
import * as listThreads from "./handlers/list-threads";
import * as listComments from "./handlers/list-comments";
import * as createThread from "./handlers/create-thread";
import * as resolveThread from "./handlers/resolve-thread";
import * as createComment from "./handlers/create-comment";
import * as updateComment from "./handlers/update-comment";
import * as deleteComment from "./handlers/delete-comment";
import * as deleteThread from "./handlers/delete-thread";
import { z } from "zod";
import { subscribeToCommentEvents } from "#events";
import { isAuthenticated } from "#lib/middleware";
import { zodId } from "#lib/mongo";
import { procedure, router } from "#lib/trpc";

const authenticatedProcedure = procedure.use(isAuthenticated);
const commentsRouter = router({
  getThread: authenticatedProcedure
    .input(getThread.inputSchema)
    .output(getThread.outputSchema)
    .query(async ({ ctx, input }) => {
      return getThread.handler(ctx, input);
    }),
  listThreads: authenticatedProcedure
    .input(listThreads.inputSchema)
    .output(listThreads.outputSchema)
    .query(async ({ ctx, input }) => {
      return listThreads.handler(ctx, input);
    }),
  listComments: authenticatedProcedure
    .input(listComments.inputSchema)
    .output(listComments.outputSchema)
    .query(async ({ ctx, input }) => {
      return listComments.handler(ctx, input);
    }),
  createThread: authenticatedProcedure
    .input(createThread.inputSchema)
    .output(createThread.outputSchema)
    .mutation(async ({ input, ctx }) => {
      return createThread.handler(ctx, input);
    }),
  resolveThread: authenticatedProcedure
    .input(resolveThread.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return resolveThread.handler(ctx, input);
    }),
  createComment: authenticatedProcedure
    .input(createComment.inputSchema)
    .output(createComment.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return createComment.handler(ctx, input);
    }),
  updateComment: authenticatedProcedure
    .input(updateComment.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateComment.handler(ctx, input);
    }),
  deleteComment: authenticatedProcedure
    .input(deleteComment.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return deleteComment.handler(ctx, input);
    }),
  deleteThread: authenticatedProcedure
    .input(deleteThread.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return deleteThread.handler(ctx, input);
    }),
  changes: authenticatedProcedure
    .input(z.object({ contentPieceId: zodId() }))
    .subscription(({ ctx, input }) => {
      return subscribeToCommentEvents(ctx, input.contentPieceId);
    })
});

export { commentsRouter };
