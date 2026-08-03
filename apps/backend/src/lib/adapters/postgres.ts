import { schema } from "#backend/db/schema";
import { config } from "#backend/lib/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: config.DATABASE_URL
});
const db = drizzle({ client: pool, schema, casing: "snake_case" });

export { db, pool };
