import { workspacesDB } from "../db";
import { config } from "../lib/config";
import { toObjectID } from "../lib/mongo";
import { stripe } from "../lib/stripe";

const handleStripeWebhook = async (request: Request): Promise<Response> => {
  if (!stripe || !config.STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, config.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
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
          { _id: toObjectID(workspaceID) },
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
          { _id: toObjectID(workspaceID) },
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
          { _id: toObjectID(workspaceID) },
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
            { _id: toObjectID(workspaceID) },
            { $set: { subscriptionStatus: "past_due" } }
          );
        }
      }

      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};

export { handleStripeWebhook };
