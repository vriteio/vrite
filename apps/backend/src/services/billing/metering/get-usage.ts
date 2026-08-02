import { dailyUsage } from "#backend/db";
import { config } from "#backend/lib/config";
import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { and, asc, eq, gte, lte } from "drizzle-orm";

interface DailyUsageRecord {
  day: number;
  count: number;
}

interface UsageData {
  dailyUsage: DailyUsageRecord[];
  totalUsage: number;
  startDate: Date;
  endDate: Date;
  resetDate: Date;
  limit: number;
}

const getUTCMonthPeriod = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const startDate = new Date(Date.UTC(year, month, 1));
  const resetDate = new Date(Date.UTC(year, month + 1, 1));

  return {
    daysInMonth: new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
    endDate: new Date(resetDate.getTime() - 1),
    resetDate,
    startDate
  };
};
const usageDate = (date: Date): string => date.toISOString().slice(0, 10);

const getUsage = async (input: {
  workspaceID: string;
  plan: string;
  date?: Date;
}): Promise<UsageData> => {
  const now = new Date();
  const targetDate = input.date || now;
  const period = getUTCMonthPeriod(targetDate);
  const isCurrentMonth =
    targetDate.getUTCFullYear() === now.getUTCFullYear() &&
    targetDate.getUTCMonth() === now.getUTCMonth();
  const limit = input.plan === "pro" ? config.PRO_INCLUDED_API_CALLS : config.INCLUDED_API_CALLS;
  const rows = await db
    .select()
    .from(dailyUsage)
    .where(
      and(
        eq(dailyUsage.workspaceID, toUUID(input.workspaceID)),
        gte(dailyUsage.usageDate, usageDate(period.startDate)),
        lte(dailyUsage.usageDate, usageDate(period.endDate))
      )
    )
    .orderBy(asc(dailyUsage.usageDate));
  const byDay = new Map(rows.map((row) => [Number(row.usageDate.slice(-2)), row.requestCount]));
  const daily: DailyUsageRecord[] = [];
  let totalUsage = 0;

  for (let day = 1; day <= period.daysInMonth; day++) {
    const count = byDay.get(day) ?? 0;

    daily.push({ day, count });
    totalUsage += count;
  }

  return {
    dailyUsage: daily,
    totalUsage,
    startDate: period.startDate,
    endDate: isCurrentMonth ? now : period.endDate,
    resetDate: period.resetDate,
    limit
  };
};

export { getUsage, getUTCMonthPeriod };
