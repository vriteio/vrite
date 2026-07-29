import { id } from "#backend/lib/id";
import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import * as z from "zod";
import { timestamps } from "./shared";
import { workspaces } from "./workspaces";

const userType = z.object({
  id: id().describe("ID of the user"),
  name: z.string().max(320).optional().describe("User's full name"),
  email: z.email().max(320).describe("Email address"),
  emailVerified: z.boolean().describe("Whether the user's email is verified"),
  image: z.string().optional().describe("URL of the user's avatar image"),
  createdAt: z.iso.datetime().describe("The creation date of the user record"),
  updatedAt: z.iso.datetime().describe("The date of the last update of the user record"),
  currentWorkspaceID: id().optional().describe("ID of the user's latest active workspace")
});
const userProfileType = userType.pick({
  id: true,
  name: true,
  email: true,
  image: true
});

const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 320 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    currentWorkspaceID: uuid("current_workspace_id").references((): AnyPgColumn => workspaces.id, {
      onDelete: "set null"
    }),
    ...timestamps
  },
  (table) => [uniqueIndex("users_email_unique").on(sql`lower(${table.email})`)]
);

type User = z.infer<typeof userType>;
type UserProfile = z.infer<typeof userProfileType>;

export { users, userProfileType, userType };
export type { User, UserProfile };
