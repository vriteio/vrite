import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

const webhookStatusEnum = pgEnum("webhook_status", [
  "received",
  "processing",
  "processed",
  "failed"
]);

const stripeWebhookEvents = pgTable(
  "stripe_webhook_events",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    workspaceID: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null"
    }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: webhookStatusEnum("status").notNull().default("received"),
    attempts: integer("attempts").notNull().default(0),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error")
  },
  (table) => [index("stripe_webhook_status_idx").on(table.status, table.receivedAt)]
);

export { stripeWebhookEvents, webhookStatusEnum };
