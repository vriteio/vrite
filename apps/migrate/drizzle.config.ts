import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "../backend/src/db/auth.ts",
    "../backend/src/db/collections.ts",
    "../backend/src/db/contents.ts",
    "../backend/src/db/stripe-webhook-events.ts",
    "../backend/src/db/entries.ts",
    "../backend/src/db/invitations.ts",
    "../backend/src/db/keys.ts",
    "../backend/src/db/memberships.ts",
    "../backend/src/db/roles.ts",
    "../backend/src/db/usage.ts",
    "../backend/src/db/users.ts",
    "../backend/src/db/workspaces.ts"
  ],
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://andesine:andesine@localhost:5432/andesine"
  },
  strict: true,
  verbose: true
});
