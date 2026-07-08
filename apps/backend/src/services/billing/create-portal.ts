import { workspacesDB } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { stripe } from "#backend/lib/stripe";
import { ORPCError } from "@orpc/server";

const createPortal = async (input: {
  workspaceID: string;
  returnURL: string;
}): Promise<{ url: string }> => {
  if (!stripe) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Stripe not configured" });

  const workspace = await workspacesDB.findOne({ _id: toUUID(input.workspaceID) });

  if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

  if (!workspace.customerID) {
    throw new ORPCError("BAD_REQUEST", { message: "Workspace has no billing account" });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: workspace.customerID,
    return_url: input.returnURL
  });

  return { url: session.url };
};

export { createPortal };
