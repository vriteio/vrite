import {
  SCHEMA_MIGRATION_JOB_NAME,
  SCHEMA_MIGRATION_PROCESSING_ATTEMPTS,
  type SchemaMigrationJobData
} from "@andesine/backend/lib/queue/schema-migration-jobs";
import type { JobHandler } from "../jobs";
import {
  executeSchemaMigration,
  reconcileFailedSchemaMigrationJob,
  type SchemaMigrationDependencies
} from "./execute";
import { recoverAbandonedSchemaMigrations } from "./recover";

const createSchemaMigrationJobHandlers = (
  dependencies: SchemaMigrationDependencies
): Map<string, JobHandler> => {
  const handlers = new Map<string, JobHandler>();

  handlers.set(SCHEMA_MIGRATION_JOB_NAME, async (job) => {
    const data = job.data as unknown as SchemaMigrationJobData;

    await executeSchemaMigration(
      {
        jobID: job.id || `schema-migration-${data.migrationID}`,
        migrationID: data.migrationID,
        rollbackOnFailure: job.attemptsMade + 1 >= SCHEMA_MIGRATION_PROCESSING_ATTEMPTS,
        workspaceID: data.workspaceID
      },
      dependencies
    );
  });

  return handlers;
};

export {
  createSchemaMigrationJobHandlers,
  reconcileFailedSchemaMigrationJob,
  recoverAbandonedSchemaMigrations
};
