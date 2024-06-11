import { Observable } from "@trpc/server/observable";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { FullSnippet } from "#collections";

type SnippetEvent =
  | { action: "delete"; userId: string; data: { id: string } }
  | { action: "create"; userId: string; data: FullSnippet }
  | {
      action: "update";
      userId: string;
      data: Partial<FullSnippet> & { id: string };
    };

const publishSnippetEvent = createEventPublisher<SnippetEvent>((contentGroupId) => {
  return `snippets:${contentGroupId}`;
});
const subscribeToSnippetEvents = (
  ctx: Context,
  workspaceId: string
): Observable<SnippetEvent, unknown> => {
  return createEventSubscription<SnippetEvent>(ctx, `snippets:${workspaceId}`);
};

export { publishSnippetEvent, subscribeToSnippetEvents };
export type { SnippetEvent };
