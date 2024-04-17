import { Observable } from "@trpc/server/observable";
import { ContextObject, Extension } from "#collections";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type ExtensionEvent =
  | { action: "delete"; data: { id: string }; userId: string }
  | { action: "create"; data: Extension & { id: string }; userId: string }
  | { action: "update"; data: { id: string; config: ContextObject }; userId: string };

const publishExtensionEvent = createEventPublisher<ExtensionEvent>((workspaceId) => {
  return `extensions:${workspaceId}`;
});
const subscribeToExtensionEvents = (
  ctx: Context,
  workspaceId: string
): Observable<ExtensionEvent, unknown> => {
  return createEventSubscription<ExtensionEvent>(ctx, `extensions:${workspaceId}`);
};

export { publishExtensionEvent, subscribeToExtensionEvents };
export type { ExtensionEvent };
