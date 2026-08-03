import { usageLedger, workspaces } from "#backend/db";
import { db, endStripeSubscription, stripe } from "#backend/lib/adapters";
import { config } from "#backend/lib/config";
import { isTerminalSubscription } from "#backend/lib/policy";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, ne, sql } from "drizzle-orm";

const endWorkspaceSubscriptions = async (input: {
  customerID: string | null;
  subscriptionID?: string;
  workspaceID: string;
}): Promise<void> => {
  if (!input.customerID && !input.subscriptionID) return;
  if (!stripe) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Stripe must be configured before deleting a workspace with billing data"
    });
  }
  const subscriptionIDs = new Set<string>();

  if (input.subscriptionID) subscriptionIDs.add(input.subscriptionID);

  if (input.customerID) {
    for await (const subscription of stripe.subscriptions.list({
      customer: input.customerID,
      status: "all"
    })) {
      if (!isTerminalSubscription(subscription.status)) subscriptionIDs.add(subscription.id);
    }
  }

  await Promise.all(
    Array.from(subscriptionIDs).map(async (subscriptionID) => {
      await endStripeSubscription({
        subscriptionID,
        idempotencyKey: `workspace-delete:${input.workspaceID}:${subscriptionID}`
      });
    })
  );
};

const reportOutstandingUsage = async (input: {
  customerID: string | null;
  workspaceID: string;
}): Promise<void> => {
  const claimed = await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        attempts: usageLedger.attempts,
        id: usageLedger.id,
        quantity: usageLedger.quantity,
        stripeEventIdentifier: usageLedger.stripeEventIdentifier
      })
      .from(usageLedger)
      .where(
        and(
          eq(usageLedger.workspaceID, toUUID(input.workspaceID)),
          ne(usageLedger.status, "delivered")
        )
      )
      .for("update");

    for (const row of rows) {
      await tx
        .update(usageLedger)
        .set({
          status: "processing",
          attempts: sql`${usageLedger.attempts} + 1`,
          updatedAt: new Date()
        })
        .where(eq(usageLedger.id, row.id));
    }

    return rows.map((row) => ({ ...row, attempts: row.attempts + 1 }));
  });

  if (claimed.length === 0) return;
  if (!stripe || !config.STRIPE_PRO_API_CALL_METER_EVENT_NAME || !input.customerID) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Stripe metering must be configured before deleting a workspace with pending usage"
    });
  }

  for (const ledger of claimed) {
    await stripe.v2.billing.meterEvents.create({
      event_name: config.STRIPE_PRO_API_CALL_METER_EVENT_NAME,
      payload: {
        stripe_customer_id: input.customerID,
        value: `${ledger.quantity}`
      },
      identifier: ledger.stripeEventIdentifier
    });
    await db
      .update(usageLedger)
      .set({
        status: "delivered",
        reportedAt: new Date(),
        lastError: null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(usageLedger.id, ledger.id),
          eq(usageLedger.status, "processing"),
          eq(usageLedger.attempts, ledger.attempts)
        )
      );
  }
};

const settle = async (input: { workspaceID: string }): Promise<void> => {
  const [workspace] = await db
    .select({
      customerID: workspaces.customerID,
      deletingAt: workspaces.deletingAt,
      subscriptionData: workspaces.subscriptionData
    })
    .from(workspaces)
    .where(eq(workspaces.id, toUUID(input.workspaceID)));

  if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
  if (!workspace.deletingAt) {
    throw new ORPCError("CONFLICT", { message: "Workspace deletion has not started" });
  }

  await reportOutstandingUsage({
    customerID: workspace.customerID,
    workspaceID: input.workspaceID
  });
  await endWorkspaceSubscriptions({
    customerID: workspace.customerID,
    subscriptionID: workspace.subscriptionData?.subscriptionID,
    workspaceID: input.workspaceID
  });
};

export { settle };
