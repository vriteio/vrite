import { schemaMigrations } from "@andesine/backend/db/content-schemas";
import { createSchemaMigrationJob } from "@andesine/backend/lib/queue/schema-migration-jobs";
import { toSchemaMigrationID, toWorkspaceID } from "@andesine/backend/lib/primitives";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import type { Queue } from "bullmq";
import { db } from "../database";

const ABANDONED_SCHEMA_MIGRATION_AGE_MS = 5 * 60 * 1000;
const SCHEMA_MIGRATION_RECOVERY_LIMIT = 100;
const recoverAbandonedSchemaMigrations = async (queue: Queue): Promise<void> => {
  const abandonedBefore = new Date(Date.now() - ABANDONED_SCHEMA_MIGRATION_AGE_MS);
  const migrations = await db
    .select({
      id: schemaMigrations.id,
      jobID: schemaMigrations.jobID,
      workspaceID: schemaMigrations.workspaceID
    })
    .from(schemaMigrations)
    .where(
      and(
        or(
          and(eq(schemaMigrations.status, "queued"), isNull(schemaMigrations.jobID)),
          eq(schemaMigrations.status, "rolling_back")
        ),
        lte(schemaMigrations.updatedAt, abandonedBefore)
      )
    )
    .limit(SCHEMA_MIGRATION_RECOVERY_LIMIT);

  for (const migration of migrations) {
    const job = createSchemaMigrationJob({
      migrationID: toSchemaMigrationID(migration.id),
      workspaceID: toWorkspaceID(migration.workspaceID)
    });

    try {
      const existingJob = await queue.getJob(migration.jobID || job.opts.jobId!);
      const state = await existingJob?.getState();

      if (existingJob) {
        if (state === "failed" || state === "completed") await existingJob.retry(state);

        continue;
      }

      const queuedJob = await queue.add(job.name, job.data, job.opts);

      await db
        .update(schemaMigrations)
        .set({ jobID: queuedJob.id || job.opts.jobId!, updatedAt: new Date() })
        .where(
          and(
            eq(schemaMigrations.id, migration.id),
            or(eq(schemaMigrations.status, "queued"), eq(schemaMigrations.status, "rolling_back"))
          )
        );
    } catch (error) {
      console.error("Failed to recover abandoned schema migration", {
        error,
        migrationID: migration.id
      });
    }
  }
};

export { recoverAbandonedSchemaMigrations };
