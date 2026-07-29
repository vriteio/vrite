import { id } from "#backend/lib/id";
import { foreignKey, index, pgTable, unique, uuid } from "drizzle-orm/pg-core";
import * as z from "zod";
import { timestamps } from "./shared";
import { roles } from "./roles";
import { users } from "./users";
import { workspaces } from "./workspaces";

const membershipType = z.object({
  id: id().describe("ID of the membership"),
  userID: id().describe("ID of the user"),
  roleID: id().describe("ID of the role")
});

const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceID: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userID: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleID: uuid("role_id").notNull(),
    ...timestamps
  },
  (table) => [
    unique("memberships_workspace_id_id_unique").on(table.workspaceID, table.id),
    unique("memberships_workspace_user_unique").on(table.workspaceID, table.userID),
    foreignKey({
      name: "memberships_workspace_role_fk",
      columns: [table.workspaceID, table.roleID],
      foreignColumns: [roles.workspaceID, roles.id]
    }).onDelete("restrict"),
    index("memberships_user_id_idx").on(table.userID),
    index("memberships_role_id_idx").on(table.roleID)
  ]
);

type Membership = z.infer<typeof membershipType>;

export { memberships, membershipType };
export type { Membership };
