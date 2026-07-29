import { dailyUsage, workspaces } from "#backend/db";
import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { ORPCError } from "@orpc/server";

const recordUsage = async (workspaceID: string): Promise<void> => {
  const workspaceUUID = toUUID(workspaceID);
  const usageDate = format(new Date(), "yyyy-MM-dd");

  await db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({
        deletingAt: workspaces.deletingAt,
        subscriptionPlan: workspaces.subscriptionPlan
      })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceUUID))
      .for("update");

    if (!workspace) {
      throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
    }
    if (workspace.deletingAt) {
      throw new ORPCError("CONFLICT", { message: "Workspace deletion is in progress" });
    }

    await tx
      .insert(dailyUsage)
      .values({ workspaceID: workspaceUUID, usageDate, requestCount: 1 })
      .onConflictDoUpdate({
        target: [dailyUsage.workspaceID, dailyUsage.usageDate],
        set: { requestCount: sql`${dailyUsage.requestCount} + 1` }
      });
    if (workspace.subscriptionPlan === "pro") {
      await tx.execute(sql`
        insert into usage_ledger (workspace_id, usage_date, quantity)
        values (${workspaceUUID}::uuid, ${usageDate}::date, 1)
        on conflict (workspace_id, usage_date) where status = 'pending'
        do update set
          quantity = usage_ledger.quantity + 1,
          updated_at = now()
      `);
    }
  });
};

export { recordUsage };
