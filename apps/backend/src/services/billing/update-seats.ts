import { memberships, workspaces } from "#backend/db";
import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { stripe } from "#backend/lib/stripe";
import { ORPCError } from "@orpc/server";
import { count, eq } from "drizzle-orm";

const updateSeats = async (input: { workspaceID: string }): Promise<void> => {
  const workspaceID = toUUID(input.workspaceID);

  await db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ subscriptionData: workspaces.subscriptionData })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");
    const seatItemID = workspace?.subscriptionData?.seatItemID;

    if (!seatItemID) return;
    if (!stripe) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Stripe must be configured before updating subscription seats"
      });
    }

    const [{ value: seatCount }] = await tx
      .select({ value: count() })
      .from(memberships)
      .where(eq(memberships.workspaceID, workspaceID));

    await stripe.subscriptionItems.update(seatItemID, {
      quantity: Math.max(seatCount, 1)
    });
  });
};

export { updateSeats };
