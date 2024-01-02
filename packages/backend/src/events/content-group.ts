import { Observable } from "@trpc/server/observable";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { ContentGroup } from "#collections";

type ContentGroupEvent =
  | {
      action: "create";
      userId: string;
      data: ContentGroup;
    }
  | {
      action: "update";
      userId: string;
      data: Partial<ContentGroup> & { id: string };
    }
  | { action: "delete"; userId: string; data: { id: string } }
  | { action: "move"; userId: string; data: ContentGroup }
  | { action: "reorder"; userId: string; data: { id: string; index: number } };

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
