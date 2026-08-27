import { id } from "#backend/lib/primitives";
import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  unique,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import * as z from "zod";
import { collections } from "./collections";
import { invitations } from "./invitations";
import { memberships } from "./memberships";
import { roles } from "./roles";
import { timestamps } from "./shared";
import { workspaces } from "./workspaces";

const groupType = z.object({
  id: id().describe("ID of the group"),
  name: z.string().min(1).max(50).describe("Name of the group")
});

const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceID: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(),
    ...timestamps
  },
  (table) => [
    unique("groups_workspace_id_id_unique").on(table.workspaceID, table.id),
    uniqueIndex("groups_workspace_name_unique").on(table.workspaceID, sql`lower(${table.name})`),
    index("groups_workspace_id_idx").on(table.workspaceID)
  ]
);

const groupMembers = pgTable(
  "group_members",
  {
    workspaceID: uuid("workspace_id").notNull(),
    groupID: uuid("group_id").notNull(),
    membershipID: uuid("membership_id").notNull(),
    ...timestamps
  },
  (table) => [
    primaryKey({ columns: [table.groupID, table.membershipID] }),
    foreignKey({
      name: "group_members_workspace_group_fk",
      columns: [table.workspaceID, table.groupID],
      foreignColumns: [groups.workspaceID, groups.id]
    }).onDelete("cascade"),
    foreignKey({
      name: "group_members_workspace_membership_fk",
      columns: [table.workspaceID, table.membershipID],
      foreignColumns: [memberships.workspaceID, memberships.id]
    }).onDelete("cascade"),
    index("group_members_membership_id_idx").on(table.membershipID)
  ]
);

const groupInvitations = pgTable(
  "group_invitations",
  {
    workspaceID: uuid("workspace_id").notNull(),
    groupID: uuid("group_id").notNull(),
    invitationID: uuid("invitation_id").notNull(),
    ...timestamps
  },
  (table) => [
    primaryKey({ columns: [table.groupID, table.invitationID] }),
    foreignKey({
      name: "group_invitations_workspace_group_fk",
      columns: [table.workspaceID, table.groupID],
      foreignColumns: [groups.workspaceID, groups.id]
    }).onDelete("cascade"),
    foreignKey({
      name: "group_invitations_workspace_invitation_fk",
      columns: [table.workspaceID, table.invitationID],
      foreignColumns: [invitations.workspaceID, invitations.id]
    }).onDelete("cascade"),
    index("group_invitations_invitation_id_idx").on(table.invitationID)
  ]
);

const collectionGroupRoles = pgTable(
  "collection_group_roles",
  {
    workspaceID: uuid("workspace_id").notNull(),
    collectionID: uuid("collection_id").notNull(),
    groupID: uuid("group_id").notNull(),
    roleID: uuid("role_id").notNull(),
    ...timestamps
  },
  (table) => [
    primaryKey({ columns: [table.collectionID, table.groupID] }),
    foreignKey({
      name: "collection_group_roles_workspace_collection_fk",
      columns: [table.workspaceID, table.collectionID],
      foreignColumns: [collections.workspaceID, collections.id]
    }).onDelete("cascade"),
    foreignKey({
      name: "collection_group_roles_workspace_group_fk",
      columns: [table.workspaceID, table.groupID],
      foreignColumns: [groups.workspaceID, groups.id]
    }).onDelete("cascade"),
    foreignKey({
      name: "collection_group_roles_workspace_role_fk",
      columns: [table.workspaceID, table.roleID],
      foreignColumns: [roles.workspaceID, roles.id]
    }).onDelete("restrict"),
    index("collection_group_roles_group_id_idx").on(table.groupID),
    index("collection_group_roles_role_id_idx").on(table.roleID)
  ]
);

const collectionMemberRoles = pgTable(
  "collection_member_roles",
  {
    workspaceID: uuid("workspace_id").notNull(),
    collectionID: uuid("collection_id").notNull(),
    membershipID: uuid("membership_id").notNull(),
    roleID: uuid("role_id").notNull(),
    ...timestamps
  },
  (table) => [
    primaryKey({ columns: [table.collectionID, table.membershipID] }),
    foreignKey({
      name: "collection_member_roles_workspace_collection_fk",
      columns: [table.workspaceID, table.collectionID],
      foreignColumns: [collections.workspaceID, collections.id]
    }).onDelete("cascade"),
    foreignKey({
      name: "collection_member_roles_workspace_membership_fk",
      columns: [table.workspaceID, table.membershipID],
      foreignColumns: [memberships.workspaceID, memberships.id]
    }).onDelete("cascade"),
    foreignKey({
      name: "collection_member_roles_workspace_role_fk",
      columns: [table.workspaceID, table.roleID],
      foreignColumns: [roles.workspaceID, roles.id]
    }).onDelete("restrict"),
    index("collection_member_roles_membership_id_idx").on(table.membershipID),
    index("collection_member_roles_role_id_idx").on(table.roleID)
  ]
);

type Group = z.infer<typeof groupType>;

export {
  collectionGroupRoles,
  collectionMemberRoles,
  groupInvitations,
  groupMembers,
  groups,
  groupType
};
export type { Group };
