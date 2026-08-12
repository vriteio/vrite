import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../drizzle");

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run database migrations");
}

const pool = new Pool({ connectionString });
const db = drizzle({ client: pool });

try {
  await migrate(db, { migrationsFolder });
  console.log("Database migrations completed");
} finally {
  await pool.end();
}
