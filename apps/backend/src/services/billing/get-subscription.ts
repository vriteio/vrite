import { workspacesDB, membershipDB } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";

interface SubscriptionInfo {
  plan: string;
  status: string;
  seats: number;
  expiresAt: string | null;
  customerID: string | null;
}

const getSubscription = async (input: { workspaceID: string }): Promise<SubscriptionInfo> => {
  const workspaceID = toUUID(input.workspaceID);
  const workspace = await workspacesDB.findOne({ _id: workspaceID });

  if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

  const seats = await membershipDB.countDocuments({ workspaceID });

  return {
    plan: workspace.subscriptionPlan || "free",
    status: workspace.subscriptionStatus || "active",
    seats,
    expiresAt: workspace.subscriptionExpiresAt
      ? new Date(workspace.subscriptionExpiresAt).toISOString()
      : null,
    customerID: workspace.customerID || null
  };
};

export { getSubscription };
export type { SubscriptionInfo };
