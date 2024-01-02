import { Observable } from "@trpc/server/observable";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { FullContentPieceWithAdditionalData } from "#collections";

type ContentPieceEvent =
  | { action: "delete"; userId: string; data: { id: string } }
  | { action: "create"; userId: string; data: FullContentPieceWithAdditionalData }
  | {
      action: "update";
      userId: string;
      variantId?: string;
      data: Partial<FullContentPieceWithAdditionalData> & { id: string };
    }
  | {
      action: "move";
      userId: string;
      data: {
        contentPiece: FullContentPieceWithAdditionalData;
        nextReferenceId?: string;
        previousReferenceId?: string;
      };
    };

const publishContentPieceEvent = createEventPublisher<ContentPieceEvent>((contentGroupId) => {
  return `contentPieces:${contentGroupId}`;
});
const subscribeToContentPieceEvents = (
  ctx: Context,
  contentGroupId: string
): Observable<ContentPieceEvent, unknown> => {
  return createEventSubscription<ContentPieceEvent>(ctx, `contentPieces:${contentGroupId}`);
};

export { publishContentPieceEvent, subscribeToContentPieceEvents };
export type { ContentPieceEvent };
