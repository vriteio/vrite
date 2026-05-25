import { redis } from "#backend/lib/redis";
import { stripe } from "#backend/lib/stripe";
import { config } from "#backend/lib/config";
import { usageDB, workspacesDB } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { randomUUID } from "node:crypto";
import { format, parse } from "date-fns";

const METER_KEY_PREFIX = "meter";
const METER_KEY_TTL = 7 * 24 * 60 * 60;

let flushTimer: ReturnType<typeof setTimeout> | null = null;

const meterKey = (workspaceID: string, date: string): string => {
  return `${METER_KEY_PREFIX}:${workspaceID}:${date}`;
};
const parseMeterKey = (key: string): { workspaceID: string; date: Date } | null => {
  const match = key.match(/^meter:([^:]+):(\d{4}-\d{2}-\d{2})$/);

  if (!match) return null;

  return { workspaceID: match[1], date: parse(match[2], "yyyy-MM-dd", new Date()) };
};
const scheduleFlush = (): void => {
  if (flushTimer) return;

  const intervalMs = config.STRIPE_PRO_API_CALL_METER_MAX_REPORTING_INTERVAL * 1000;

  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushUsage();
  }, intervalMs);
  flushTimer.unref();
};
const recordUsage = async (workspaceID: string): Promise<void> => {
  const date = format(new Date(), "yyyy-MM-dd");
  const key = meterKey(workspaceID, date);

  await redis.incr(key);
  await redis.expire(key, METER_KEY_TTL);
  scheduleFlush();
};
const flushUsage = async (): Promise<void> => {
  const keys = await redis.keys(`${METER_KEY_PREFIX}:*`);

  if (keys.length === 0) return;

  const values = await redis.mGet(keys);
  const workspaceData = new Map<
    string,
    {
      total: number;
      entries: {
        key: string;
        year: number;
        month: number;
        day: number;
        count: number;
      }[];
    }
  >();

  for (let i = 0; i < keys.length; i++) {
    const parsed = parseMeterKey(keys[i]);

    if (!parsed) continue;

    const count = parseInt(values[i] || "0", 10);

    if (count <= 0) continue;

    const entry = {
      key: keys[i],
      year: parsed.date.getFullYear(),
      month: parsed.date.getMonth() + 1,
      day: parsed.date.getDate(),
      count
    };
    const existing = workspaceData.get(parsed.workspaceID);

    if (existing) {
      existing.total += count;
      existing.entries.push(entry);
    } else {
      workspaceData.set(parsed.workspaceID, {
        total: count,
        entries: [entry]
      });
    }
  }

  for (const [workspaceID, data] of workspaceData) {
    try {
      // Persist to MongoDB
      for (const entry of data.entries) {
        await usageDB.updateOne(
          {
            workspaceID: toObjectID(workspaceID),
            year: entry.year,
            month: entry.month,
            day: entry.day
          },
          { $inc: { requestCount: entry.count } },
          { upsert: true }
        );
      }

      // Send to Stripe
      if (stripe && config.STRIPE_PRO_API_CALL_METER_EVENT_NAME && data.total > 0) {
        const workspace = await workspacesDB.findOne({
          _id: toObjectID(workspaceID)
        });

        if (workspace?.customerID && workspace.subscriptionPlan === "pro") {
          await stripe.v2.billing.meterEvents.create({
            event_name: config.STRIPE_PRO_API_CALL_METER_EVENT_NAME,
            payload: {
              stripe_customer_id: workspace.customerID,
              value: String(data.total)
            },
            identifier: randomUUID()
          });
        }
      }

      // Remove from Redis
      const keysToDelete = data.entries.map((e) => e.key);

      if (keysToDelete.length > 0) {
        await redis.del(keysToDelete);
      }
    } catch (error) {
      console.error(`Failed to flush meter events for workspace ${workspaceID}:`, error);
    }
  }
};

export { recordUsage, flushUsage, meterKey, parseMeterKey };
