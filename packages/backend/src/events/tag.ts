import { Observable } from "@trpc/server/observable";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { Tag } from "#database";

type TagEvent =
  | { action: "create"; data: Tag }
  | { action: "update"; data: Partial<Tag> & { id: string } }
  | {
      action: "delete";
      data: { id: string };
    };

const publishTagEvent = createEventPublisher<TagEvent>((workspaceId) => `tags:${workspaceId}`);
const subscribeToTagEvents = (ctx: Context, workspaceId: string): Observable<TagEvent, unknown> => {
  return createEventSubscription<TagEvent>(ctx, `tags:${workspaceId}`);
};

export { publishTagEvent, subscribeToTagEvents };
export type { TagEvent };
