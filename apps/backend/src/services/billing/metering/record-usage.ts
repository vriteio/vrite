import { dailyUsage } from "#backend/db";
import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { sql } from "drizzle-orm";
import { format } from "date-fns";

const recordUsage = async (workspaceID: string): Promise<void> => {
  const workspaceUUID = toUUID(workspaceID);
  const usageDate = format(new Date(), "yyyy-MM-dd");

  await db.transaction(async (tx) => {
    await tx
      .insert(dailyUsage)
      .values({ workspaceID: workspaceUUID, usageDate, requestCount: 1 })
      .onConflictDoUpdate({
        target: [dailyUsage.workspaceID, dailyUsage.usageDate],
        set: { requestCount: sql`${dailyUsage.requestCount} + 1` }
      });
    await tx.execute(sql`
      insert into usage_ledger (workspace_id, usage_date, quantity)
      values (${workspaceUUID}::uuid, ${usageDate}::date, 1)
      on conflict (workspace_id, usage_date) where status = 'pending'
      do update set
        quantity = usage_ledger.quantity + 1,
        updated_at = now()
    `);
  });
};

export { recordUsage };
