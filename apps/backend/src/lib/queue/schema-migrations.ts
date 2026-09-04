import { schemaMigrations } from "#backend/db";
import {
  emitEntryEvent,
  emitCollectionEvent,
  emitPublishingEntryContentUpdates,
  emitSchemaMigrationEvent
} from "#backend/events";
import { restoreSchemaEntryMove } from "#backend/lib/schema/migration/entry-move";
import { restoreSchemaCollectionMove } from "#backend/lib/schema/migration/collection-move";
import { db } from "#backend/lib/adapters/postgres";
import type { EffectiveSchemaChangePlan } from "#backend/lib/schema/migration/effective-change";
import {
  toCollectionID,
  toEntryID,
  toSchemaMigrationID,
  toUUID,
  toWorkspaceID
} from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { searchIndexingQueue } from "./client";
import { enqueueCurrentEntrySync, enqueuePublishedEntrySync } from "./search-indexing";
import { createSchemaMigrationJob, type SchemaMigrationJobData } from "./schema-migration-jobs";

interface SubmitSchemaMigrationInput extends EffectiveSchemaChangePlan {
  prepareAffectedContent?(): Promise<void>;
  workspaceID: string;
}

const SCHEMA_MIGRATION_SUBMISSION_ATTEMPTS = 3;
const SCHEMA_MIGRATION_SUBMISSION_RETRY_DELAY_MS = 250;
const wait = (duration: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, duration));
};
const enqueueSchemaMigration = async (data: SchemaMigrationJobData): Promise<string> => {
  const job = createSchemaMigrationJob(data);
  let lastError: unknown;

  for (let attempt = 1; attempt <= SCHEMA_MIGRATION_SUBMISSION_ATTEMPTS; attempt += 1) {
    try {
      const queuedJob = await searchIndexingQueue.add(job.name, job.data, job.opts);

      return queuedJob.id || job.opts.jobId!;
    } catch (error) {
      lastError = error;

      if (attempt < SCHEMA_MIGRATION_SUBMISSION_ATTEMPTS) {
        await wait(SCHEMA_MIGRATION_SUBMISSION_RETRY_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  if (lastError instanceof Error) throw lastError;

  throw new Error("Failed to submit schema migration");
};
const submitSchemaMigration = async (input: SubmitSchemaMigrationInput): Promise<void> => {
  if (!input.migrationID) {
    // Effective-schema removal does not need worker conversion, but open entry and schema
    // documents still need to reload their new unrestricted or inherited structure.
    try {
      await input.prepareAffectedContent?.();
    } catch (error) {
      console.error("Failed to refresh schema content", { error });
    }

    return;
  }

  const migrationID = toSchemaMigrationID(toUUID(input.migrationID));
  const workspaceID = toWorkspaceID(toUUID(input.workspaceID));
  const collectionIDs = input.affectedCollectionIDs.map((collectionID) => {
    return toCollectionID(toUUID(collectionID));
  });

  try {
    await input.prepareAffectedContent?.();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to prepare schema migration";

    await db
      .update(schemaMigrations)
      .set({ status: "rolling_back", error: message, updatedAt: new Date() })
      .where(eq(schemaMigrations.id, toUUID(migrationID)));

    const { restoredMove, restoredCollectionMove } = await db.transaction(async (transaction) => {
      const move = await restoreSchemaEntryMove(
        transaction,
        toUUID(migrationID),
        toUUID(workspaceID)
      );

      const collectionMove = await restoreSchemaCollectionMove(
        transaction,
        toUUID(migrationID),
        toUUID(workspaceID)
      );

      await transaction
        .update(schemaMigrations)
        .set({ status: "failed", error: message, completedAt: new Date(), updatedAt: new Date() })
        .where(eq(schemaMigrations.id, toUUID(migrationID)));

      return { restoredMove: move, restoredCollectionMove: collectionMove };
    });

    if (restoredMove) {
      const syncInput = { workspaceID, entryIDs: [restoredMove.move.id] };

      emitEntryEvent(workspaceID, { action: "entry:move", data: restoredMove.move });
      emitPublishingEntryContentUpdates({ workspaceID, entries: [restoredMove.publishingContent] });
      await Promise.all([enqueueCurrentEntrySync(syncInput), enqueuePublishedEntrySync(syncInput)]);
    }

    if (restoredCollectionMove) {
      const syncInput = { workspaceID, entryIDs: restoredCollectionMove.entryIDs.map(toEntryID) };

      emitCollectionEvent(workspaceID, {
        action: "collection:move",
        data: restoredCollectionMove.move
      });
      emitPublishingEntryContentUpdates({
        workspaceID,
        entries: restoredCollectionMove.publishingContent
      });
      await Promise.all([enqueueCurrentEntrySync(syncInput), enqueuePublishedEntrySync(syncInput)]);
    }
    emitSchemaMigrationEvent(workspaceID, {
      action: "schema-migration:update",
      data: {
        id: migrationID,
        schemaID: null,
        collectionIDs,
        status: "failed",
        totalEntries: input.totalEntries,
        processedEntries: 0
      }
    });

    throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
  }

  emitSchemaMigrationEvent(workspaceID, {
    action: "schema-migration:update",
    data: {
      id: migrationID,
      schemaID: null,
      collectionIDs,
      status: "queued",
      totalEntries: input.totalEntries,
      processedEntries: 0
    }
  });

  try {
    const jobID = await enqueueSchemaMigration({ migrationID, workspaceID });

    await db
      .update(schemaMigrations)
      .set({ jobID, updatedAt: new Date() })
      .where(eq(schemaMigrations.id, toUUID(migrationID)));
  } catch (error) {
    // Keep the migration queued. The worker recovery scan submits migrations that did not
    // receive a job ID after a process interruption or a temporary queue failure.
    console.error("Failed to submit schema migration; recovery will retry it", {
      error,
      migrationID
    });
  }
};

export { enqueueSchemaMigration, submitSchemaMigration };
export type { SubmitSchemaMigrationInput };
