import { id } from "#backend/lib/id";
import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import * as z from "zod";
import { timestamps } from "./shared";

interface SubscriptionData {
  subscriptionID: string;
  seatItemID?: string;
  apiUsageItemID?: string;
  cancelAtPeriodEnd?: boolean;
}

const workspaceType = z.object({
  id: id().describe("ID of the workspace"),
  name: z.string().min(1).max(50).describe("Name of the workspace"),
  customerID: z.string().optional().describe("Stripe customer ID"),
  subscriptionStatus: z.string().optional().describe("Subscription status"),
  subscriptionPlan: z.string().optional().describe("Subscription plan"),
  subscriptionData: z.string().optional().describe("JSON-stringified subscription data"),
  subscriptionExpiresAt: z.iso.datetime().optional().describe("Billing cycle expiration")
});

const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 50 }).notNull(),
    customerID: text("customer_id"),
    subscriptionStatus: text("subscription_status").notNull().default("active"),
    subscriptionPlan: text("subscription_plan").notNull().default("free"),
    subscriptionData: jsonb("subscription_data").$type<SubscriptionData>(),
    subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),
    deletingAt: timestamp("deleting_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("workspaces_customer_id_unique")
      .on(table.customerID)
      .where(sql`${table.customerID} is not null`)
  ]
);

type Workspace = z.infer<typeof workspaceType>;

export { workspaces, workspaceType };
export type { SubscriptionData, Workspace };
