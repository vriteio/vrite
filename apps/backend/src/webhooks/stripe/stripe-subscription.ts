import { config } from "#backend/lib/config";
import { isTerminalSubscription } from "#backend/lib/policy";
import type { workspaces } from "#backend/db";
import type Stripe from "stripe";

interface StripeSubscriptionResolution {
  activeSubscriptionID?: string;
  update?: Partial<typeof workspaces.$inferInsert>;
  workspaceID?: string;
}

const subscriptionValues = (
  subscription: Stripe.Subscription
): Partial<typeof workspaces.$inferInsert> => {
  const seatItem = subscription.items.data.find((item) => {
    return item.price.id === config.STRIPE_PRO_SEAT_PRICE_ID;
  });
  const apiUsageItem = subscription.items.data.find((item) => {
    return item.price.id === config.STRIPE_PRO_API_CALL_PRICE_ID;
  });
  const isTerminal = isTerminalSubscription(subscription.status);
  const isPro = Boolean(seatItem && apiUsageItem) && !isTerminal;
  const currentPeriodStart = seatItem?.current_period_start ?? apiUsageItem?.current_period_start;
  const currentPeriodEnd = seatItem?.current_period_end ?? apiUsageItem?.current_period_end;
  const terminalEnd = subscription.ended_at ?? subscription.canceled_at;

  return {
    subscriptionPlan: isPro ? "pro" : "free",
    subscriptionStatus: subscription.status,
    subscriptionData: {
      subscriptionID: subscription.id,
      seatItemID: isTerminal ? undefined : seatItem?.id,
      apiUsageItemID: isTerminal ? undefined : apiUsageItem?.id,
      billingCycleAnchor: subscription.billing_cycle_anchor,
      cancelAt: subscription.cancel_at,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at,
      cancellationDetails: subscription.cancellation_details,
      collectionMethod: subscription.collection_method,
      createdAt: subscription.created,
      currentPeriodEnd: currentPeriodEnd ?? null,
      currentPeriodStart: currentPeriodStart ?? null,
      endedAt: subscription.ended_at,
      startedAt: subscription.start_date,
      trialEnd: subscription.trial_end,
      trialStart: subscription.trial_start
    },
    subscriptionExpiresAt:
      isTerminal && terminalEnd
        ? new Date(terminalEnd * 1000)
        : currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000)
          : null,
    updatedAt: new Date()
  };
};
const resolveSubscription = (
  subscription: Stripe.Subscription,
  includeActiveSubscription: boolean
): StripeSubscriptionResolution => ({
  workspaceID: subscription.metadata?.workspaceID,
  activeSubscriptionID:
    includeActiveSubscription && !isTerminalSubscription(subscription.status)
      ? subscription.id
      : undefined,
  update: subscriptionValues(subscription)
});
const resolveStripeSubscriptionEvent = async (
  event: Stripe.Event,
  stripe: Stripe
): Promise<StripeSubscriptionResolution> => {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const subscriptionID =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

    if (!session.metadata?.workspaceID || !subscriptionID) {
      return { workspaceID: session.metadata?.workspaceID };
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionID);

    return {
      ...resolveSubscription(subscription, true),
      workspaceID: session.metadata.workspaceID
    };
  }

  if (event.type === "customer.subscription.updated") {
    return resolveSubscription(event.data.object, true);
  }

  if (event.type === "customer.subscription.deleted") {
    return resolveSubscription(event.data.object, false);
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const subscriptionRef = event.data.object.parent?.subscription_details?.subscription;
    const subscriptionID =
      typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;

    if (!subscriptionID) return {};

    const subscription = await stripe.subscriptions.retrieve(subscriptionID);

    return resolveSubscription(subscription, true);
  }

  return {};
};

export { resolveStripeSubscriptionEvent };
export type { StripeSubscriptionResolution };
