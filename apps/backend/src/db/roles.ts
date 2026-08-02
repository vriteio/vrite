import { id } from "#backend/lib/id";
import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, unique, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import * as z from "zod";
import { timestamps } from "./shared";
import { workspaces } from "./workspaces";

const permissionEnum = pgEnum("permission", [
  "content",
  "api_keys",
  "read:api_keys",
  "billing",
  "read:billing",
  "workspace"
]);
const baseRoleEnum = pgEnum("base_role", ["admin", "viewer"]);
const permissionType = z.enum([
  "content",
  "api_keys",
  "read:api_keys",
  "billing",
  "read:billing",
  "workspace"
]);
const baseRoleType = z.enum(["admin", "viewer"]);
const roleType = z.object({
  id: id().describe("ID of the role"),
  name: z.string().min(1).max(50).describe("Name of the role"),
  permissions: z.array(permissionType).describe("Permissions granted to the role"),
  baseRole: baseRoleType.optional().describe("If this role is an unremovable base role")
});

const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceID: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    permissions: permissionEnum("permissions")
      .array()
      .notNull()
      .default(sql`'{}'`),
    baseRole: baseRoleEnum("base_role"),
    ...timestamps
  },
  (table) => [
    unique("roles_workspace_id_id_unique").on(table.workspaceID, table.id),
    unique("roles_workspace_base_role_unique").on(table.workspaceID, table.baseRole),
    uniqueIndex("roles_workspace_name_unique").on(table.workspaceID, sql`lower(${table.name})`),
    index("roles_workspace_id_idx").on(table.workspaceID)
  ]
);

type Permission = z.infer<typeof permissionType>;
type BaseRole = z.infer<typeof baseRoleType>;
type Role = z.infer<typeof roleType>;

export { baseRoleEnum, baseRoleType, permissionEnum, permissionType, roles, roleType };
export type { BaseRole, Permission, Role };
