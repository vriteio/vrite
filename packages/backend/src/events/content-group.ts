import { Observable } from "@trpc/server/observable";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { ContentGroup } from "#database";

type ContentGroupEvent =
  | {
      action: "create";
      data: ContentGroup;
    }
  | {
      action: "update";
      data: Partial<ContentGroup> & { id: string };
    }
  | { action: "delete"; data: { id: string } }
  | { action: "move"; data: ContentGroup }
  | { action: "reorder"; data: { id: string; index: number } };

const publishContentGroupEvent = createEventPublisher<ContentGroupEvent>(
  (workspaceId) => `contentGroups:${workspaceId}`
);
const subscribeToContentGroupEvents = (
  ctx: Context,
  workspaceId: string
): Observable<ContentGroupEvent, unknown> => {
  return createEventSubscription<ContentGroupEvent>(ctx, `contentGroups:${workspaceId}`);
};

export { publishContentGroupEvent, subscribeToContentGroupEvents };
export type { ContentGroupEvent };
