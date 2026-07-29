import { stripeWebhookEvents, workspaces } from "#backend/db";
import { config } from "#backend/lib/config";
import { toUUID } from "#backend/lib/id";
import { stripe } from "#backend/lib/stripe";
import { db } from "#backend/lib/postgres";
import {
  endStripeSubscription,
  isTerminalSubscription
} from "#backend/services/billing/end-subscription";
import { and, eq, ne, sql } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import type Stripe from "stripe";

const subscriptionValues = (subscription: Stripe.Subscription) => {
  const seatItem = subscription.items.data.find((item) => {
    return item.price.id === config.STRIPE_PRO_SEAT_PRICE_ID;
  });
  const apiUsageItem = subscription.items.data.find((item) => {
    return item.price.id === config.STRIPE_PRO_API_CALL_PRICE_ID;
  });

  return {
    subscriptionStatus: subscription.status,
    subscriptionData: {
      subscriptionID: subscription.id,
      seatItemID: seatItem?.id,
      apiUsageItemID: apiUsageItem?.id
    },
    subscriptionExpiresAt: new Date((subscription.items.data[0]?.current_period_end ?? 0) * 1000),
    updatedAt: new Date()
  };
};

const handleStripeWebhook = async (
  request: FastifyRequest<{ Body: Buffer }>,
  reply: FastifyReply
): Promise<void> => {
  if (!stripe || !config.STRIPE_WEBHOOK_SECRET) {
    return reply.status(500).send({ error: "Stripe not configured" });
  }

  const signature = request.headers["stripe-signature"];

  if (!signature) return reply.status(400).send({ error: "Missing signature" });

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(request.body, signature, config.STRIPE_WEBHOOK_SECRET);
  } catch {
    return reply.status(400).send({ error: "Invalid signature" });
  }

  await db
    .insert(stripeWebhookEvents)
    .values({
      id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>
    })
    .onConflictDoNothing({ target: stripeWebhookEvents.id });
  const [storedEvent] = await db
    .select({ status: stripeWebhookEvents.status })
    .from(stripeWebhookEvents)
    .where(eq(stripeWebhookEvents.id, event.id));

  if (storedEvent?.status === "processed") {
    return reply.status(200).send({ received: true });
  }

  try {
    let workspaceID: string | undefined;
    let update: Partial<typeof workspaces.$inferInsert> | undefined;
    let activeSubscriptionID: string | undefined;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      workspaceID = session.metadata?.workspaceID;

      if (workspaceID && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string" ? session.subscription : session.subscription.id
        );

        activeSubscriptionID = isTerminalSubscription(subscription.status)
          ? undefined
          : subscription.id;
        update = {
          ...subscriptionValues(subscription),
          subscriptionPlan: "pro",
          subscriptionStatus: "active"
        };
      }
    } else if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;

      workspaceID = subscription.metadata?.workspaceID;
      activeSubscriptionID = isTerminalSubscription(subscription.status)
        ? undefined
        : subscription.id;
      update = subscriptionValues(subscription);
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;

      workspaceID = subscription.metadata?.workspaceID;
      update = {
        subscriptionPlan: "free",
        subscriptionStatus: "inactive",
        subscriptionData: null,
        subscriptionExpiresAt: null,
        updatedAt: new Date()
      };
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const subscriptionRef = invoice.parent?.subscription_details?.subscription;
      const subscriptionID =
        typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;

      if (subscriptionID) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionID);

        workspaceID = subscription.metadata?.workspaceID;
        activeSubscriptionID = isTerminalSubscription(subscription.status)
          ? undefined
          : subscription.id;
        update = { subscriptionStatus: "past_due", updatedAt: new Date() };
      }
    }

    const workspaceUUID = workspaceID ? toUUID(workspaceID) : null;

    if (workspaceUUID && activeSubscriptionID) {
      const [workspace] = await db
        .select({ id: workspaces.id, deletingAt: workspaces.deletingAt })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceUUID))
        .limit(1);

      if (!workspace || workspace.deletingAt) {
        await endStripeSubscription({
          subscriptionID: activeSubscriptionID,
          idempotencyKey: `deleted-workspace:${workspaceID}:${activeSubscriptionID}`
        });
      }
    }

    await db.transaction(async (tx) => {
      const [record] = await tx
        .select({ status: stripeWebhookEvents.status })
        .from(stripeWebhookEvents)
        .where(eq(stripeWebhookEvents.id, event.id))
        .for("update");

      if (!record || record.status === "processed") return;

      const [workspace] = workspaceUUID
        ? await tx
            .select({ id: workspaces.id, deletingAt: workspaces.deletingAt })
            .from(workspaces)
            .where(eq(workspaces.id, workspaceUUID))
            .for("update")
        : [];
      const persistedWorkspaceID = workspace?.id ?? null;

      await tx
        .update(stripeWebhookEvents)
        .set({
          status: "processing",
          attempts: sql`${stripeWebhookEvents.attempts} + 1`,
          workspaceID: persistedWorkspaceID,
          lastError: null
        })
        .where(eq(stripeWebhookEvents.id, event.id));

      if (persistedWorkspaceID && !workspace?.deletingAt && update) {
        await tx.update(workspaces).set(update).where(eq(workspaces.id, persistedWorkspaceID));
      }

      await tx
        .update(stripeWebhookEvents)
        .set({ status: "processed", processedAt: new Date() })
        .where(eq(stripeWebhookEvents.id, event.id));
    });
  } catch (error) {
    await db
      .update(stripeWebhookEvents)
      .set({
        status: "failed",
        lastError: error instanceof Error ? error.message : String(error)
      })
      .where(
        and(eq(stripeWebhookEvents.id, event.id), ne(stripeWebhookEvents.status, "processed"))
      );
    request.log.error(error, "Stripe webhook processing failed");
    return reply.status(500).send({ error: "Webhook processing failed" });
  }

  return reply.status(200).send({ received: true });
};

export { handleStripeWebhook };
