import { memberships, workspaces } from "#backend/db";
import { toUUID, toWorkspaceID } from "#backend/lib/primitives";
import { db, stripe } from "#backend/lib/adapters";
import { config } from "#backend/lib/config";
import { ORPCError } from "@orpc/server";
import { count, eq } from "drizzle-orm";
import { addMonths, startOfMonth } from "date-fns";

const getNextUTCMonthStart = (date: Date): Date => {
  return startOfMonth(addMonths(date, 1));
};

const createCheckout = async (input: {
  workspaceID: string;
  successURL: string;
  cancelURL: string;
}): Promise<{ url: string }> => {
  if (!stripe) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Stripe not configured" });

  if (!config.STRIPE_PRO_SEAT_PRICE_ID || !config.STRIPE_PRO_API_CALL_PRICE_ID) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Stripe price IDs not configured" });
  }

  const workspaceUUID = toUUID(input.workspaceID);
  const workspaceID = toWorkspaceID(workspaceUUID);
  const stripeClient = stripe;

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceUUID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
    if (workspace.deletingAt) {
      throw new ORPCError("CONFLICT", { message: "Workspace deletion is in progress" });
    }

    const [{ value: seatCount }] = await tx
      .select({ value: count() })
      .from(memberships)
      .where(eq(memberships.workspaceID, workspaceUUID));
    let customerID = workspace.customerID;

    if (!customerID) {
      const customer = await stripeClient.customers.create(
        {
          name: workspace.name,
          metadata: { workspaceID }
        },
        { idempotencyKey: `workspace-customer:${workspaceUUID}` }
      );

      customerID = customer.id;
      await tx
        .update(workspaces)
        .set({ customerID, updatedAt: new Date() })
        .where(eq(workspaces.id, workspaceUUID));
    }

    let hasPendingSubscription = false;
    let hasManageableSubscription = false;

    for await (const subscription of stripeClient.subscriptions.list({
      customer: customerID,
      status: "all"
    })) {
      if (subscription.status === "incomplete") {
        hasPendingSubscription = true;
      } else if (
        subscription.status !== "canceled" &&
        subscription.status !== "incomplete_expired"
      ) {
        hasManageableSubscription = true;
      }
    }

    if (hasManageableSubscription) {
      throw new ORPCError("SUBSCRIPTION_MANAGE_IN_PORTAL", {
        status: 409,
        message: "An existing subscription must be managed in Billing Portal"
      });
    }
    if (hasPendingSubscription) {
      throw new ORPCError("SUBSCRIPTION_SETUP_PENDING", {
        status: 409,
        message: "Subscription setup is still processing"
      });
    }

    const openSessions = await stripeClient.checkout.sessions.list({
      customer: customerID,
      status: "open",
      limit: 10
    });
    const existingSession = openSessions.data.find((session) => {
      return session.mode === "subscription" && session.metadata?.workspaceID === workspaceID;
    });

    if (existingSession?.url) return { url: existingSession.url };

    const billingCycleAnchor = Math.floor(getNextUTCMonthStart(new Date()).getTime() / 1000);
    const session = await stripeClient.checkout.sessions.create({
      customer: customerID,
      mode: "subscription",
      line_items: [
        {
          price: config.STRIPE_PRO_SEAT_PRICE_ID,
          quantity: Math.max(seatCount, 1)
        },
        {
          price: config.STRIPE_PRO_API_CALL_PRICE_ID
        }
      ],
      success_url: input.successURL,
      cancel_url: input.cancelURL,
      metadata: { workspaceID },
      subscription_data: {
        billing_cycle_anchor: billingCycleAnchor,
        metadata: { workspaceID },
        proration_behavior: "create_prorations"
      }
    });

    if (!session.url) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create checkout session"
      });
    }

    return { url: session.url };
  });
};

export { createCheckout };
