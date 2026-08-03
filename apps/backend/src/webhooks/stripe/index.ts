import { config } from "#backend/lib/config";
import { toUUID } from "#backend/lib/primitives";
import { stripe } from "#backend/lib/adapters";
import { Billing } from "#backend/services/billing";
import type { FastifyReply, FastifyRequest } from "fastify";
import type Stripe from "stripe";
import {
  failStripeWebhookEvent,
  getWorkspaceDeletionState,
  persistStripeWebhookResult,
  registerStripeWebhookEvent
} from "./stripe-event-store";
import { resolveStripeSubscriptionEvent } from "./stripe-subscription";

const parseStripeEvent = (
  request: FastifyRequest<{ Body: Buffer }>,
  stripeClient: Stripe,
  webhookSecret: string
): Stripe.Event | "missing-signature" | "invalid-signature" => {
  const signature = request.headers["stripe-signature"];

  if (!signature) return "missing-signature";

  try {
    return stripeClient.webhooks.constructEvent(request.body, signature, webhookSecret);
  } catch {
    return "invalid-signature";
  }
};
const handleStripeWebhook = async (
  request: FastifyRequest<{ Body: Buffer }>,
  reply: FastifyReply
): Promise<void> => {
  if (!stripe || !config.STRIPE_WEBHOOK_SECRET) {
    return reply.status(500).send({ error: "Stripe not configured" });
  }

  const event = parseStripeEvent(request, stripe, config.STRIPE_WEBHOOK_SECRET);

  if (event === "missing-signature") {
    return reply.status(400).send({ error: "Missing signature" });
  }
  if (event === "invalid-signature") {
    return reply.status(400).send({ error: "Invalid signature" });
  }

  const alreadyProcessed = await registerStripeWebhookEvent(event);

  if (alreadyProcessed) return reply.status(200).send({ received: true });

  try {
    const result = await resolveStripeSubscriptionEvent(event, stripe);
    const workspaceID = result.workspaceID ? toUUID(result.workspaceID) : null;

    if (workspaceID && result.activeSubscriptionID) {
      const workspace = await getWorkspaceDeletionState(workspaceID);

      if (!workspace || workspace.deletingAt) {
        await Billing.endSubscription({
          subscriptionID: result.activeSubscriptionID,
          idempotencyKey: `deleted-workspace:${result.workspaceID}:${result.activeSubscriptionID}`
        });
      }
    }

    await persistStripeWebhookResult({
      eventID: event.id,
      workspaceID,
      update: result.update
    });
  } catch (error) {
    await failStripeWebhookEvent(event.id, error);
    request.log.error(error, "Stripe webhook processing failed");
    return reply.status(500).send({ error: "Webhook processing failed" });
  }

  return reply.status(200).send({ received: true });
};

export { handleStripeWebhook };
