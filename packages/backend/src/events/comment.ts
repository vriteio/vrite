import { Observable } from "@trpc/server/observable";
import { Comment, CommentThread, CommentMember } from "#collections";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

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
      data: Pick<Comment, "id" | "content" | "threadId">;
    }
  | {
      action: "deleteComment";
      data: Pick<Comment, "id" | "threadId">;
    };

const publishCommentEvent = createEventPublisher<CommentEvent>((contentPieceId) => {
  return `comments:${contentPieceId}`;
});
const subscribeToCommentEvents = (
  ctx: Context,
  contentPieceId: string
): Observable<CommentEvent, unknown> => {
  return createEventSubscription<CommentEvent>(ctx, `comments:${contentPieceId}`);
};

export { publishCommentEvent, subscribeToCommentEvents };
export type { CommentEvent };
