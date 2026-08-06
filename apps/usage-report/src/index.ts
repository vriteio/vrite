// Import specific adapter to avoid eager evaluation of other adapters like Redis
import { pool } from "@andesine/backend/lib/adapters/postgres";
import { reportUsage } from "./report-usage";

try {
  const reportedCount = await reportUsage();

  console.log(`Stripe usage reporting completed (${reportedCount} ledger rows processed)`);
} catch (error) {
  console.error("Stripe usage reporting failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
