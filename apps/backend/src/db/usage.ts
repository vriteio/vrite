import { db, objectID, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";
import * as z from "zod";

const usageRecordType = z.object({
  id: objectID().describe("ID of the usage record"),
  workspaceID: objectID().describe("ID of the workspace"),
  year: z.number().int().describe("Year of the usage record"),
  month: z.number().int().min(1).max(12).describe("Month of the usage record (1-12)"),
  day: z.number().int().min(1).max(31).describe("Day of the usage record (1-31)"),
  requestCount: z.number().int().min(0).describe("Number of API requests for this day")
});

interface UsageRecord<ID extends string | ObjectId = string> extends Omit<
  z.infer<typeof usageRecordType>,
  "id" | "workspaceID"
> {
  id: ID;
  workspaceID: ID;
}
interface FullUsageRecord<ID extends string | ObjectId = string> extends UsageRecord<ID> {}

const usageDB = db.collection<UnderscoreID<FullUsageRecord<ObjectId>>>("usage");

await usageDB.createIndex(
  { workspaceID: 1, year: 1, month: 1 },
  { name: "workspaceID_1_year_1_month_1" }
);
await usageDB.createIndex(
  { workspaceID: 1, year: 1, month: 1, day: 1 },
  { unique: true, name: "workspaceID_1_year_1_month_1_day_1" }
);

export { usageRecordType, usageDB };
export type { UsageRecord };
