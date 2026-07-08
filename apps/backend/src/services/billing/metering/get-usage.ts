import { usageDB } from "#backend/db";
import { config } from "#backend/lib/config";
import { toUUID } from "#backend/lib/mongo";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { meterKey, parseMeterKey } from "./record-usage";
import { redis } from "#backend/lib/redis";

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

const getUnflushedUsageByDay = async (
  workspaceID: string,
  year: number,
  month: number
): Promise<Map<number, number>> => {
  const prefix = meterKey(workspaceID, format(new Date(year, month - 1, 1), "yyyy-MM"));
  const keys = await redis.keys(`${prefix}-*`);
  const result = new Map<number, number>();

  if (keys.length === 0) return result;

  const values = await redis.mGet(keys);

  for (let i = 0; i < keys.length; i++) {
    const meterKey = keys[i];
    const value = values[i] || "0";
    const parsed = parseMeterKey(meterKey);

    if (!parsed) continue;

    const day = parsed.date.getDate();
    const count = parseInt(value, 10);

    if (day > 0 && count > 0) {
      result.set(day, (result.get(day) || 0) + count);
    }
  }

  return result;
};
const getUsage = async (input: {
  workspaceID: string;
  plan: string;
  date?: Date;
}): Promise<UsageData> => {
  const now = new Date();
  const targetDate = input.date || now;
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const limit = input.plan === "pro" ? config.PRO_INCLUDED_API_CALLS : config.INCLUDED_API_CALLS;

  // Flushed data from MongoDB
  const flushedRecords = await usageDB
    .find({
      workspaceID: toUUID(input.workspaceID),
      year,
      month
    })
    .toArray();
  const flushedMap = new Map<number, number>();

  for (const record of flushedRecords) {
    flushedMap.set(record.day, record.requestCount);
  }

  // Unflushed data from Redis
  const unflushedMap = await getUnflushedUsageByDay(input.workspaceID, year, month);

  // Merge flushed + unflushed
  const dailyUsage: DailyUsageRecord[] = [];
  let totalUsage = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const count = (flushedMap.get(day) || 0) + (unflushedMap.get(day) || 0);

    dailyUsage.push({ day: day, count });
    totalUsage += count;
  }

  return {
    dailyUsage,
    totalUsage,
    startDate: startOfMonth(targetDate),
    endDate: isCurrentMonth ? now : endOfMonth(targetDate),
    limit
  };
};

export { getUsage };
