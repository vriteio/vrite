import { Observable } from "@trpc/server/observable";
import { Context } from "#lib/context";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { Webhook } from "#database";

type WebhookEvent =
  | {
      action: "create";
      data: Webhook & { id: string };
    }
  | {
      action: "update";
      data: Partial<Webhook> & { id: string };
    }
  | {
      action: "delete";
      data: { id: string };
    };

const publishWebhookEvent = createEventPublisher<WebhookEvent>((workspaceId) => {
  return `webhooks:${workspaceId}`;
});
const subscribeToWebhookEvents = (
  ctx: Context,
  workspaceId: string
): Observable<WebhookEvent, unknown> => {
  return createEventSubscription<WebhookEvent>(ctx, `webhooks:${workspaceId}`);
};

export { publishWebhookEvent, subscribeToWebhookEvents };
export type { WebhookEvent };
