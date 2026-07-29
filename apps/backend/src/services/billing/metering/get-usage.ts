import { dailyUsage } from "#backend/db";
import { config } from "#backend/lib/config";
import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { endOfMonth, format, startOfMonth } from "date-fns";

interface DailyUsageRecord {
  day: number;
  count: number;
}

interface UsageData {
  dailyUsage: DailyUsageRecord[];
  totalUsage: number;
  startDate: Date;
  endDate: Date;
  limit: number;
}

const getUsage = async (input: {
  workspaceID: string;
  plan: string;
  date?: Date;
}): Promise<UsageData> => {
  const now = new Date();
  const targetDate = input.date || now;
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);
  const isCurrentMonth =
    targetDate.getFullYear() === now.getFullYear() && targetDate.getMonth() === now.getMonth();
  const limit = input.plan === "pro" ? config.PRO_INCLUDED_API_CALLS : config.INCLUDED_API_CALLS;
  const rows = await db
    .select()
    .from(dailyUsage)
    .where(
      and(
        eq(dailyUsage.workspaceID, toUUID(input.workspaceID)),
        gte(dailyUsage.usageDate, format(monthStart, "yyyy-MM-dd")),
        lte(dailyUsage.usageDate, format(monthEnd, "yyyy-MM-dd"))
      )
    )
    .orderBy(asc(dailyUsage.usageDate));
  const byDay = new Map(rows.map((row) => [Number(row.usageDate.slice(-2)), row.requestCount]));
  const daysInMonth = monthEnd.getDate();
  const daily: DailyUsageRecord[] = [];
  let totalUsage = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const count = byDay.get(day) ?? 0;

    daily.push({ day, count });
    totalUsage += count;
  }

  return {
    dailyUsage: daily,
    totalUsage,
    startDate: monthStart,
    endDate: isCurrentMonth ? now : monthEnd,
    limit
  };
};

export { getUsage };
