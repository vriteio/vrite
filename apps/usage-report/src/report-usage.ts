import { config } from "@andesine/backend/lib/config";
import { pool } from "@andesine/backend/lib/postgres";
import { stripe } from "@andesine/backend/lib/stripe";

interface UsageLedgerRow {
  id: string;
  workspace_id: string;
  quantity: string;
  stripe_event_identifier: string;
  attempts: number;
}

interface WorkspaceRow {
  customer_id: string | null;
  subscription_plan: string;
}

const claimUsage = async (): Promise<UsageLedgerRow | null> => {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const claimed = await client.query<Pick<UsageLedgerRow, "id">>(`
      select id
      from usage_ledger
      where (
        status in ('pending', 'failed')
        and available_at <= now()
      ) or (
        status = 'processing'
        and updated_at <= now() - interval '5 minutes'
      )
      order by created_at
      limit 1
      for update skip locked
    `);
    const row = claimed.rows[0];

    if (!row) {
      await client.query("commit");
      return null;
    }

    const updated = await client.query<UsageLedgerRow>(
      `
        update usage_ledger
        set
          status = 'processing',
          attempts = attempts + 1,
          updated_at = now()
        where id = $1
        returning id, workspace_id, quantity, stripe_event_identifier, attempts
      `,
      [row.id]
    );

    await client.query("commit");

    return updated.rows[0] ?? null;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
};

const reportUsage = async (): Promise<number> => {
  let reportedCount = 0;
  const failures: unknown[] = [];

  for (;;) {
    const ledger = await claimUsage();

    if (!ledger) {
      if (failures.length > 0) {
        throw new AggregateError(
          failures,
          `Failed to report ${failures.length} usage ledger row(s); ${reportedCount} row(s) succeeded`
        );
      }

      return reportedCount;
    }

    try {
      const workspaceResult = await pool.query<WorkspaceRow>(
        `
          select customer_id, subscription_plan
          from workspaces
          where id = $1
          limit 1
        `,
        [ledger.workspace_id]
      );
      const workspace = workspaceResult.rows[0];

      if (workspace?.customer_id && workspace.subscription_plan === "pro") {
        if (!stripe || !config.STRIPE_PRO_API_CALL_METER_EVENT_NAME) {
          throw new Error("Stripe metering is not configured");
        }

        await stripe.v2.billing.meterEvents.create({
          event_name: config.STRIPE_PRO_API_CALL_METER_EVENT_NAME,
          payload: {
            stripe_customer_id: workspace.customer_id,
            value: ledger.quantity
          },
          identifier: ledger.stripe_event_identifier
        });
      }

      const delivered = await pool.query(
        `
          update usage_ledger
          set
            status = 'delivered',
            reported_at = now(),
            last_error = null,
            updated_at = now()
          where id = $1
            and status = 'processing'
            and attempts = $2
        `,
        [ledger.id, ledger.attempts]
      );

      if (delivered.rowCount === 1) reportedCount += 1;
    } catch (error) {
      const delay = Math.min(60 * 60 * 1000, 2 ** Math.min(ledger.attempts, 10) * 1000);

      const failed = await pool.query(
        `
          update usage_ledger
          set
            status = 'failed',
            available_at = $3,
            last_error = $4,
            updated_at = now()
          where id = $1
            and status = 'processing'
            and attempts = $2
        `,
        [
          ledger.id,
          ledger.attempts,
          new Date(Date.now() + delay),
          error instanceof Error ? error.message : String(error)
        ]
      );

      if (failed.rowCount === 1) failures.push(error);
    }
  }
};

export { reportUsage };
