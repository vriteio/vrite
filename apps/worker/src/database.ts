import { schema } from "@andesine/backend/db/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "./config";

const pool = new Pool({ connectionString: config.DATABASE_URL });
const db = drizzle({
  client: pool,
  schema,
  casing: "snake_case"
});

export { db, pool };
