import { customType, pgEnum, timestamp } from "drizzle-orm/pg-core";

const versionReasonEnum = pgEnum("version_reason", [
  "auto",
  "manual",
  "revert",
  "schema-migration"
]);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  }
});
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
};

export { bytea, timestamps, versionReasonEnum };
