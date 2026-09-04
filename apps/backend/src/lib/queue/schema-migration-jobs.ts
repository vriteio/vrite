import type { JobsOptions } from "bullmq";

interface SchemaMigrationJobData {
  migrationID: string;
  workspaceID: string;
}
interface SchemaMigrationJob {
  name: string;
  data: SchemaMigrationJobData;
  opts: JobsOptions;
}

const SCHEMA_MIGRATION_JOB_NAME = "schema-migration";
const SCHEMA_MIGRATION_PROCESSING_ATTEMPTS = 3;
const createSchemaMigrationJob = (data: SchemaMigrationJobData): SchemaMigrationJob => ({
  name: SCHEMA_MIGRATION_JOB_NAME,
  data,
  opts: {
    // Keep one final attempt available to finish an interrupted rollback.
    attempts: SCHEMA_MIGRATION_PROCESSING_ATTEMPTS + 1,
    backoff: {
      type: "exponential",
      delay: 1000
    },
    jobId: `schema-migration-${data.migrationID}`,
    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 1000
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
      count: 5000
    }
  }
});

export {
  SCHEMA_MIGRATION_JOB_NAME,
  SCHEMA_MIGRATION_PROCESSING_ATTEMPTS,
  createSchemaMigrationJob
};
export type { SchemaMigrationJob, SchemaMigrationJobData };
