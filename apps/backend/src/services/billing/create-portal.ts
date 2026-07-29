import { workspaces } from "#backend/db";
import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { stripe } from "#backend/lib/stripe";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

const createPortal = async (input: {
  workspaceID: string;
  returnURL: string;
}): Promise<{ url: string }> => {
  if (!stripe) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Stripe not configured" });

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, toUUID(input.workspaceID)))
    .limit(1);

  if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
  if (workspace.deletingAt) {
    throw new ORPCError("CONFLICT", { message: "Workspace deletion is in progress" });
  }

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
