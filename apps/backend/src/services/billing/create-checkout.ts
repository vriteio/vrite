import { workspacesDB } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { stripe } from "#backend/lib/stripe";
import { config } from "#backend/lib/config";
import { membershipDB } from "#backend/db";
import { ORPCError } from "@orpc/server";

const createCheckout = async (input: {
  workspaceID: string;
  successURL: string;
  cancelURL: string;
}): Promise<{ url: string }> => {
  if (!stripe) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Stripe not configured" });

  if (!config.STRIPE_PRO_SEAT_PRICE_ID || !config.STRIPE_PRO_API_CALL_PRICE_ID) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Stripe price IDs not configured" });
  }

  const workspaceOID = toObjectID(input.workspaceID);
  const workspace = await workspacesDB.findOne({ _id: workspaceOID });

  if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

  // Count current seats (memberships)
  const seatCount = await membershipDB.countDocuments({ workspaceID: workspaceOID });

  // Create or reuse Stripe customer
  let customerID = workspace.customerID;

  if (!customerID) {
    const customer = await stripe.customers.create({
      name: workspace.name,
      metadata: { workspaceID: input.workspaceID }
    });

    customerID = customer.id;
    await workspacesDB.updateOne({ _id: workspaceOID }, { $set: { customerID } });
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
