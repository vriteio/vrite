import { collections } from "@andesine/backend/db/collections";
import { contents } from "@andesine/backend/db/contents";
import { entries } from "@andesine/backend/db/entries";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "./config";

const pool = new Pool({ connectionString: config.DATABASE_URL });
const db = drizzle({
  client: pool,
  schema: { collections, contents, entries },
  casing: "snake_case"
});

export { db, pool };
