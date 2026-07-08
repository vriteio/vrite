import { FastifyReply, FastifyRequest } from "fastify";
import { workspacesDB } from "../db";
import { config } from "../lib/config";
import { toUUID } from "../lib/mongo";
import { stripe } from "../lib/stripe";

const handleStripeWebhook = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (!stripe || !config.STRIPE_WEBHOOK_SECRET) {
    return reply.status(500).send({ error: "Stripe not configured" });
  }

  const body = request.body as string;
  const sig = request.headers["stripe-signature"];

  if (!sig) {
    return reply.status(400).send({ error: "Missing signature" });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, config.STRIPE_WEBHOOK_SECRET);
  } catch {
    return reply.status(400).send({ error: "Invalid signature" });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const workspaceID = session.metadata?.workspaceID;

      if (workspaceID && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const seatItem = subscription.items.data.find(
          (item) => item.price.id === config.STRIPE_PRO_SEAT_PRICE_ID
        );
        const apiUsageItem = subscription.items.data.find(
          (item) => item.price.id === config.STRIPE_PRO_API_CALL_PRICE_ID
        );

        await workspacesDB.updateOne(
          { _id: toUUID(workspaceID) },
          {
            $set: {
              subscriptionPlan: "pro",
              subscriptionStatus: "active",
              subscriptionData: JSON.stringify({
                subscriptionID: subscription.id,
                seatItemID: seatItem?.id,
                apiUsageItemID: apiUsageItem?.id
              }),
              subscriptionExpiresAt: new Date(
                (subscription.items.data[0]?.current_period_end ?? 0) * 1000
              ).toISOString()
            }
          }
        );
      }

      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const workspaceID = subscription.metadata?.workspaceID;

      if (workspaceID) {
        const seatItem = subscription.items.data.find(
          (item) => item.price.id === config.STRIPE_PRO_SEAT_PRICE_ID
        );
        const apiUsageItem = subscription.items.data.find(
          (item) => item.price.id === config.STRIPE_PRO_API_CALL_PRICE_ID
        );

        await workspacesDB.updateOne(
          { _id: toUUID(workspaceID) },
          {
            $set: {
              subscriptionStatus: subscription.status,
              subscriptionData: JSON.stringify({
                subscriptionID: subscription.id,
                seatItemID: seatItem?.id,
                apiUsageItemID: apiUsageItem?.id
              }),
              subscriptionExpiresAt: new Date(
                (subscription.items.data[0]?.current_period_end ?? 0) * 1000
              ).toISOString()
            }
          }
        );
      }

      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const workspaceID = subscription.metadata?.workspaceID;

      if (workspaceID) {
        await workspacesDB.updateOne(
          { _id: toUUID(workspaceID) },
          {
            $set: {
              subscriptionPlan: "free",
              subscriptionStatus: "inactive",
              subscriptionData: undefined,
              subscriptionExpiresAt: undefined
            }
          }
        );
      }

      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subscriptionRef = invoice.parent?.subscription_details?.subscription;
      const subscriptionId =
        typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const workspaceID = subscription.metadata?.workspaceID;

        if (workspaceID) {
          await workspacesDB.updateOne(
            { _id: toUUID(workspaceID) },
            { $set: { subscriptionStatus: "past_due" } }
          );
        }
      }

      break;
    }
  }

  return reply.status(200).send({ received: true });
};

export { handleStripeWebhook };
