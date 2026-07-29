import { id } from "#backend/lib/id";
import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import * as z from "zod";
import { memberships } from "./memberships";
import { roles } from "./roles";
import { workspaces } from "./workspaces";

const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "expired"]);
const inviteStatusType = z.enum(["pending", "accepted", "expired"]);
const inviteType = z.object({
  id: id().describe("ID of the invite"),
  email: z.email().max(320).describe("Email address of the invited user"),
  roleID: id().describe("ID of the role to assign"),
  invitedBy: id().optional().describe("ID of the member who created the invite"),
  status: inviteStatusType.describe("Current status of the invite"),
  createdAt: z.iso.datetime().describe("When the invite was created"),
  expiresAt: z.iso.datetime().describe("When the invite expires")
});

const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceID: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    roleID: uuid("role_id").notNull(),
    invitedBy: uuid("invited_by").references(() => memberships.id, {
      onDelete: "set null"
    }),
    status: invitationStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
  },
  (table) => [
    foreignKey({
      name: "invitations_workspace_role_fk",
      columns: [table.workspaceID, table.roleID],
      foreignColumns: [roles.workspaceID, roles.id]
    }).onDelete("restrict"),
    uniqueIndex("invitations_pending_email_unique")
      .on(table.workspaceID, sql`lower(${table.email})`)
      .where(sql`${table.status} = 'pending'`),
    index("invitations_workspace_status_idx").on(table.workspaceID, table.status),
    index("invitations_invited_by_idx").on(table.invitedBy),
    index("invitations_expires_at_idx").on(table.expiresAt)
  ]
);

type Invite = z.infer<typeof inviteType>;

export { invitationStatusEnum, invitations, inviteStatusType, inviteType };
export type { Invite };
