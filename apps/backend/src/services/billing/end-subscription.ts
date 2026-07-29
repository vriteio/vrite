import { usageLedger, workspaces } from "#backend/db";
import { config } from "#backend/lib/config";
import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { stripe } from "#backend/lib/stripe";
import { and, eq, ne, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const isTerminalSubscription = (status: string): boolean => {
  return status === "canceled" || status === "incomplete_expired";
};

const endStripeSubscription = async (input: {
  idempotencyKey: string;
  subscriptionID: string;
}): Promise<void> => {
  if (!stripe) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Stripe must be configured before ending a subscription"
    });
  }

  const subscription = await stripe.subscriptions.retrieve(input.subscriptionID);

  if (isTerminalSubscription(subscription.status) || subscription.cancel_at_period_end) return;

  if (subscription.status === "incomplete") {
    await stripe.subscriptions.cancel(
      input.subscriptionID,
      {},
      { idempotencyKey: input.idempotencyKey }
    );
    return;
  }

  await stripe.subscriptions.update(
    input.subscriptionID,
    { cancel_at_period_end: true },
    { idempotencyKey: input.idempotencyKey }
  );
};

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
  const stripeClient = stripe;
  const subscriptionIDs = new Set<string>();

  if (input.subscriptionID) {
    subscriptionIDs.add(input.subscriptionID);
  }

  if (input.customerID) {
    for await (const subscription of stripeClient.subscriptions.list({
      customer: input.customerID,
      status: "all"
    })) {
      if (!isTerminalSubscription(subscription.status)) {
        subscriptionIDs.add(subscription.id);
      }
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

const endSubscription = async (input: { workspaceID: string }): Promise<void> => {
  const workspaceID = toUUID(input.workspaceID);
  const billing = await db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({
        customerID: workspaces.customerID,
        subscriptionData: workspaces.subscriptionData
      })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

    await tx
      .update(workspaces)
      .set({ deletingAt: new Date(), updatedAt: new Date() })
      .where(and(eq(workspaces.id, workspaceID), sql`${workspaces.deletingAt} is null`));

    return {
      customerID: workspace.customerID,
      subscriptionID: workspace.subscriptionData?.subscriptionID
    };
  });

  await reportOutstandingUsage({
    customerID: billing.customerID,
    workspaceID: input.workspaceID
  });
  await endWorkspaceSubscriptions({
    customerID: billing.customerID,
    subscriptionID: billing.subscriptionID,
    workspaceID: input.workspaceID
  });
};

export { endStripeSubscription, endSubscription, isTerminalSubscription };
