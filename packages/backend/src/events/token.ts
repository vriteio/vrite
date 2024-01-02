import { Observable } from "@trpc/server/observable";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { Token } from "#collections";

type TokenEvent =
  | {
      action: "create";
      data: Token;
    }
  | { action: "update"; data: Partial<Token> & { id: string } }
  | { action: "delete"; data: { id: string } };

const publishTokenEvent = createEventPublisher<TokenEvent>(
  (workspaceId) => `tokens:${workspaceId}`
);
const subscribeToTokenEvents = (
  ctx: Context,
  workspaceId: string
): Observable<TokenEvent, unknown> => {
  return createEventSubscription<TokenEvent>(ctx, `tokens:${workspaceId}`);
};

export { publishTokenEvent, subscribeToTokenEvents };
export type { TokenEvent };
