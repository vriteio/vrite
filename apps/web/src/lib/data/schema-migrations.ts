interface SchemaMigrationProgress {
  collectionIDs: string[];
  id: string;
  processedEntries: number;
  status: SchemaMigrationStatus;
  totalEntries: number;
}

type SchemaMigrationStatus = "completed" | "failed" | "queued" | "rolling_back" | "running";

const ACTIVE_SCHEMA_MIGRATION_STATUSES: SchemaMigrationStatus[] = [
  "queued",
  "running",
  "rolling_back"
];
const isSchemaMigrationActive = (migration?: SchemaMigrationProgress | null): boolean => {
  return Boolean(migration && ACTIVE_SCHEMA_MIGRATION_STATUSES.includes(migration.status));
};
const getSchemaMigrationProgress = (migration: SchemaMigrationProgress): number => {
  if (migration.totalEntries === 0) return migration.status === "completed" ? 100 : 0;

  return Math.min(100, Math.round((migration.processedEntries / migration.totalEntries) * 100));
};

export { ACTIVE_SCHEMA_MIGRATION_STATUSES, getSchemaMigrationProgress, isSchemaMigrationActive };
export type { SchemaMigrationProgress, SchemaMigrationStatus };
