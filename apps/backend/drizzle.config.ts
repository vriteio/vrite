import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "./src/db/auth.ts",
    "./src/db/collections.ts",
    "./src/db/contents.ts",
    "./src/db/stripe-webhook-events.ts",
    "./src/db/entries.ts",
    "./src/db/invitations.ts",
    "./src/db/keys.ts",
    "./src/db/memberships.ts",
    "./src/db/roles.ts",
    "./src/db/usage.ts",
    "./src/db/users.ts",
    "./src/db/workspaces.ts"
  ],
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://andesine:andesine@localhost:5432/andesine"
  },
  strict: true,
  verbose: true
});
