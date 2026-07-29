import { id } from "#backend/lib/id";
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import * as z from "zod";
import { timestamps } from "./shared";
import { workspaces } from "./workspaces";

const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "processing",
  "delivered",
  "failed"
]);
const usageRecordType = z.object({
  id: id().describe("ID of the usage record"),
  workspaceID: id().describe("ID of the workspace"),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  requestCount: z.number().int().min(0)
});

const dailyUsage = pgTable(
  "daily_usage",
  {
    workspaceID: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    usageDate: date("usage_date", { mode: "string" }).notNull(),
    requestCount: bigint("request_count", { mode: "number" }).notNull().default(0)
  },
  (table) => [
    primaryKey({ columns: [table.workspaceID, table.usageDate] }),
    check("daily_usage_request_count_nonnegative", sql`${table.requestCount} >= 0`)
  ]
);

const usageLedger = pgTable(
  "usage_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceID: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    usageDate: date("usage_date", { mode: "string" }).notNull(),
    quantity: bigint("quantity", { mode: "number" }).notNull(),
    stripeEventIdentifier: uuid("stripe_event_identifier").notNull().defaultRandom(),
    status: deliveryStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    reportedAt: timestamp("reported_at", { withTimezone: true }),
    lastError: text("last_error"),
    ...timestamps
  },
  (table) => [
    unique("usage_ledger_stripe_identifier_unique").on(table.stripeEventIdentifier),
    uniqueIndex("usage_ledger_pending_workspace_date_unique")
      .on(table.workspaceID, table.usageDate)
      .where(sql`${table.status} = 'pending'`),
    check("usage_ledger_quantity_positive", sql`${table.quantity} > 0`),
    index("usage_ledger_delivery_idx").on(table.status, table.availableAt)
  ]
);

type UsageRecord = z.infer<typeof usageRecordType>;

export { dailyUsage, deliveryStatusEnum, usageLedger, usageRecordType };
export type { UsageRecord };
