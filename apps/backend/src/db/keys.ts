import { id } from "#backend/lib/primitives";
import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import * as z from "zod";
import { memberships } from "./memberships";
import { workspaces } from "./workspaces";

const keyPermissionEnum = pgEnum("key_permission", [
  "entries",
  "read:entries",
  "versions",
  "read:versions",
  "publishing",
  "read:publishing",
  "collections",
  "read:collections",
  "memberships",
  "read:memberships",
  "roles",
  "read:roles"
]);
const keyPermissionType = z.enum([
  "entries",
  "read:entries",
  "versions",
  "read:versions",
  "publishing",
  "read:publishing",
  "collections",
  "read:collections",
  "memberships",
  "read:memberships",
  "roles",
  "read:roles"
]);
const keyType = z.object({
  id: id().describe("The ID of the API key"),
  name: z.string().describe("The name for the API key"),
  permissions: z.array(keyPermissionType).describe("The permissions of the API key"),
  prefix: z.string().describe("The first characters of the raw key"),
  memberID: id().describe("The member who created the API key"),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().describe("The last update date"),
  expiresAt: z.iso.datetime().nullable().describe("The expiration date")
});

const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceID: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    memberID: uuid("member_id").notNull(),
    name: text("name").notNull(),
    permissions: keyPermissionEnum("permissions")
      .array()
      .notNull()
      .default(sql`'{}'`),
    prefix: varchar("prefix", { length: 12 }).notNull(),
    hash: text("hash").notNull(),
    salt: text("salt").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true })
  },
  (table) => [
    foreignKey({
      name: "api_keys_workspace_member_fk",
      columns: [table.workspaceID, table.memberID],
      foreignColumns: [memberships.workspaceID, memberships.id]
    }).onDelete("cascade"),
    index("api_keys_prefix_idx").on(table.prefix),
    index("api_keys_workspace_id_idx").on(table.workspaceID),
    index("api_keys_expires_at_idx").on(table.expiresAt)
  ]
);

type KeyPermission = z.infer<typeof keyPermissionType>;
type Key = z.infer<typeof keyType>;

export { apiKeys, keyPermissionEnum, keyPermissionType, keyType };
export type { Key, KeyPermission };
