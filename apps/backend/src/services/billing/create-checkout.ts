import { memberships, workspaces } from "#backend/db";
import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { stripe } from "#backend/lib/stripe";
import { config } from "#backend/lib/config";
import { ORPCError } from "@orpc/server";
import { count, eq } from "drizzle-orm";

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
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceUUID))
    .limit(1);

  if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

  // Count current seats (memberships)
  const [{ value: seatCount }] = await db
    .select({ value: count() })
    .from(memberships)
    .where(eq(memberships.workspaceID, workspaceUUID));

  // Create or reuse Stripe customer
  let customerID = workspace.customerID;

  if (!customerID) {
    const customer = await stripe.customers.create(
      {
        name: workspace.name,
        metadata: { workspaceID: input.workspaceID }
      },
      { idempotencyKey: `workspace-customer:${workspaceUUID}` }
    );

    customerID = customer.id;
    await db
      .update(workspaces)
      .set({ customerID, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceUUID));
  }

  const session = await stripe.checkout.sessions.create({
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
    metadata: { workspaceID: input.workspaceID },
    subscription_data: {
      metadata: { workspaceID: input.workspaceID }
    }
  });

  if (!session.url) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create checkout session" });
  }

  return { url: session.url };
};

export { createCheckout };
