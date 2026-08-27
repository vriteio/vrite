import { memberships, workspaces } from "#backend/db";
import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { ORPCError } from "@orpc/server";
import { count, eq } from "drizzle-orm";

interface SubscriptionInfo {
  plan: string;
  status: string;
  seats: number;
  expiresAt: string | null;
  customerID: string | null;
  cancelAt: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  endedAt: string | null;
}

const stripeTimestampToISOString = (timestamp?: number | null): string | null => {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
};

const getSubscription = async (input: { workspaceID: string }): Promise<SubscriptionInfo> => {
  const workspaceID = toUUID(input.workspaceID);
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceID))
    .limit(1);

  if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

  const [{ value: seats }] = await db
    .select({ value: count() })
    .from(memberships)
    .where(eq(memberships.workspaceID, workspaceID));

  return {
    plan: workspace.subscriptionPlan || "free",
    status: workspace.subscriptionStatus || "active",
    seats,
    expiresAt: workspace.subscriptionExpiresAt
      ? new Date(workspace.subscriptionExpiresAt).toISOString()
      : null,
    customerID: workspace.customerID || null,
    cancelAt: stripeTimestampToISOString(workspace.subscriptionData?.cancelAt),
    cancelAtPeriodEnd: workspace.subscriptionData?.cancelAtPeriodEnd || false,
    canceledAt: stripeTimestampToISOString(workspace.subscriptionData?.canceledAt),
    endedAt: stripeTimestampToISOString(workspace.subscriptionData?.endedAt)
  };
};

export { getSubscription };
export type { SubscriptionInfo };
