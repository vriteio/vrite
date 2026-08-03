import { ORPCError } from "@orpc/server";
import { isTerminalSubscription } from "#backend/lib/policy/subscription";
import { stripe } from "./stripe";

const endStripeSubscription = async (input: {
  idempotencyKey: string;
  subscriptionID: string;
}): Promise<void> => {
  if (!stripe) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Stripe must be configured before ending a subscription"
    });
  }

  const subscription = await stripe.subscriptions.retrieve(input.subscriptionID);

  if (isTerminalSubscription(subscription.status) || subscription.cancel_at_period_end) return;

  if (subscription.status === "incomplete") {
    await stripe.subscriptions.cancel(
      input.subscriptionID,
      {},
      { idempotencyKey: input.idempotencyKey }
    );
    return;
  }

  await stripe.subscriptions.update(
    input.subscriptionID,
    { cancel_at_period_end: true },
    { idempotencyKey: input.idempotencyKey }
  );
};

export { endStripeSubscription };
