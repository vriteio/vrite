import {
  collectionSchemas,
  schemaMigrationCollections,
  schemaMigrationEntries,
  schemaMigrations
} from "@andesine/backend/db/content-schemas";
import {
  createCurrentEntrySyncJobs,
  createPublishedEntrySyncJobs
} from "@andesine/backend/lib/queue/search-indexing-jobs";
import { restoreSchemaEntryMove } from "@andesine/backend/lib/schema/migration/entry-move";
import { restoreSchemaCollectionMove } from "@andesine/backend/lib/schema/migration/collection-move";
import {
  toCollectionID,
  toEntryID,
  toSchemaID,
  toSchemaMigrationID,
  toUUID,
  toWorkspaceID
} from "@andesine/backend/lib/primitives";
import { and, eq, inArray } from "drizzle-orm";
import type { Queue } from "bullmq";
import { db } from "../database";
import { activateMigration } from "./activate";
import { processMigrationEntry, rollbackMigrationEntry } from "./entry";
import { publishMigrationRecoveryVersionEvents } from "./versions";

interface ExecuteSchemaMigrationInput {
  jobID: string;
  migrationID: string;
  rollbackOnFailure: boolean;
  workspaceID: string;
}
interface ReconcileFailedSchemaMigrationJobInput {
  error: unknown;
  migrationID: string;
  workspaceID: string;
}
interface SchemaMigrationDependencies {
  publish: (channel: string, message: string) => Promise<unknown>;
  queue: Queue;
}
interface MigrationStatusEventInput {
  collectionIDs: string[];
  migrationID: string;
  schemaID: string | null;
  processedEntries: number;
  status: "queued" | "running" | "rolling_back" | "completed" | "failed";
  totalEntries: number;
  workspaceID: string;
}
const publishSchemaDeletion = async (
  migration: typeof schemaMigrations.$inferSelect,
  publish: SchemaMigrationDependencies["publish"]
): Promise<void> => {
  if (!migration.schemaID || migration.schemaVersionID) return;

  try {
    const [schema] = await db
      .select({ collectionID: collectionSchemas.collectionID })
      .from(collectionSchemas)
      .where(
        and(eq(collectionSchemas.id, migration.schemaID), eq(collectionSchemas.enabled, false))
      );

    if (!schema) return;

    await publish(
      `${toWorkspaceID(migration.workspaceID)}:schemas`,
      JSON.stringify({
        action: "schema:delete",
        data: {
          id: toSchemaID(migration.schemaID),
          collectionID: toCollectionID(schema.collectionID),
          enabled: false,
          hasActiveVersion: false,
          hasUnappliedChanges: false
        }
      })
    );
  } catch (error) {
    console.error("Failed to publish schema deletion", { error, migrationID: migration.id });
  }
};
const publishMigrationStatus = async (
  input: MigrationStatusEventInput,
  publish: SchemaMigrationDependencies["publish"]
): Promise<void> => {
  try {
    await publish(
      `${toWorkspaceID(input.workspaceID)}:schema-migrations`,
      JSON.stringify({
        action: "schema-migration:update",
        data: {
          id: toSchemaMigrationID(input.migrationID),
          schemaID: input.schemaID ? toSchemaID(input.schemaID) : null,
          collectionIDs: input.collectionIDs.map(toCollectionID),
          status: input.status,
          totalEntries: input.totalEntries,
          processedEntries: input.processedEntries
        }
      })
    );
  } catch (error) {
    console.error("Failed to publish schema migration progress", {
      error,
      migrationID: input.migrationID
    });
  }
};
const enqueueEntrySync = async (
  entryIDs: string[],
  workspaceID: string,
  queue: Queue
): Promise<void> => {
  const syncInput = {
    workspaceID: toWorkspaceID(workspaceID),
    entryIDs: entryIDs.map(toEntryID)
  };
  const jobs = [
    ...createCurrentEntrySyncJobs(syncInput),
    ...createPublishedEntrySyncJobs(syncInput)
  ];

  if (jobs.length === 0) return;

  try {
    await queue.addBulk(jobs);
  } catch (error) {
    console.error("Failed to submit migrated entries for search indexing", {
      error,
      entryCount: jobs.length,
      workspaceID
    });
  }
};
const getChangedCompletedEntryIDs = async (migrationID: string): Promise<string[]> => {
  const entries = await db
    .select({
      entryID: schemaMigrationEntries.entryID,
      sourceHash: schemaMigrationEntries.sourceHash,
      targetHash: schemaMigrationEntries.targetHash
    })
    .from(schemaMigrationEntries)
    .where(
      and(
        eq(schemaMigrationEntries.migrationID, migrationID),
        eq(schemaMigrationEntries.status, "completed")
      )
    );

  return entries
    .filter(({ sourceHash, targetHash }) => sourceHash !== targetHash)
    .map(({ entryID }) => entryID);
};
const failMigration = async (
  input: {
    collectionIDs: string[];
    entryID: string | null;
    error: unknown;
    migrationID: string;
    schemaID: string | null;
    processedEntries: number;
    totalEntries: number;
    workspaceID: string;
  },
  dependencies: SchemaMigrationDependencies
): Promise<string[]> => {
  const message = input.error instanceof Error ? input.error.message : "Unknown migration error";
  const rollbackErrors: string[] = [];

  await db
    .update(schemaMigrations)
    .set({ status: "rolling_back", error: message, updatedAt: new Date() })
    .where(eq(schemaMigrations.id, input.migrationID));

  if (input.entryID) {
    await db
      .update(schemaMigrationEntries)
      .set({ status: "failed", error: message, completedAt: new Date() })
      .where(
        and(
          eq(schemaMigrationEntries.migrationID, input.migrationID),
          eq(schemaMigrationEntries.entryID, input.entryID),
          inArray(schemaMigrationEntries.status, ["queued", "processing"])
        )
      );
  }

  await publishMigrationStatus(
    {
      collectionIDs: input.collectionIDs,
      migrationID: input.migrationID,
      schemaID: input.schemaID,
      processedEntries: input.processedEntries,
      status: "rolling_back",
      totalEntries: input.totalEntries,
      workspaceID: input.workspaceID
    },
    dependencies.publish
  );

  const completedEntries = await db
    .select({ entryID: schemaMigrationEntries.entryID })
    .from(schemaMigrationEntries)
    .where(
      and(
        eq(schemaMigrationEntries.migrationID, input.migrationID),
        eq(schemaMigrationEntries.status, "completed")
      )
    );

  for (const entry of completedEntries) {
    try {
      await rollbackMigrationEntry({
        entryID: entry.entryID,
        migrationID: input.migrationID,
        workspaceID: input.workspaceID
      });
    } catch (error) {
      rollbackErrors.push(
        `${entry.entryID}: ${error instanceof Error ? error.message : "Unknown rollback error"}`
      );
    }
  }

  await db
    .update(schemaMigrationEntries)
    .set({ status: "failed", error: "Migration stopped", completedAt: new Date() })
    .where(
      and(
        eq(schemaMigrationEntries.migrationID, input.migrationID),
        inArray(schemaMigrationEntries.status, ["queued", "processing"])
      )
    );

  const finalError =
    rollbackErrors.length > 0
      ? `${message}; rollback failures: ${rollbackErrors.join(", ")}`
      : message;

  if (rollbackErrors.length > 0) {
    await db
      .update(schemaMigrations)
      .set({ error: finalError, updatedAt: new Date() })
      .where(eq(schemaMigrations.id, input.migrationID));
    throw new Error(finalError);
  }

  const { restoredMove, restoredCollectionMove } = await db.transaction(async (transaction) => {
    const move = await restoreSchemaEntryMove(transaction, input.migrationID, input.workspaceID);
    const collectionMove = await restoreSchemaCollectionMove(
      transaction,
      input.migrationID,
      input.workspaceID
    );

    await transaction
      .update(schemaMigrations)
      .set({ status: "failed", error: finalError, completedAt: new Date(), updatedAt: new Date() })
      .where(eq(schemaMigrations.id, input.migrationID));

    return { restoredMove: move, restoredCollectionMove: collectionMove };
  });

  if (restoredMove) {
    try {
      await dependencies.publish(
        `${toWorkspaceID(input.workspaceID)}:entries`,
        JSON.stringify({ action: "entry:move", data: restoredMove.move })
      );
      await dependencies.publish(
        `${toWorkspaceID(input.workspaceID)}:publishing`,
        JSON.stringify({
          action: "publishing:entries-content-update",
          data: { entries: [restoredMove.publishingContent] }
        })
      );
    } catch (error) {
      console.error("Failed to publish restored entry location", {
        error,
        migrationID: input.migrationID
      });
    }
  }
  if (restoredCollectionMove) {
    try {
      await dependencies.publish(
        `${toWorkspaceID(input.workspaceID)}:collections`,
        JSON.stringify({
          action: "collection:move",
          data: restoredCollectionMove.move
        })
      );
      await dependencies.publish(
        `${toWorkspaceID(input.workspaceID)}:publishing`,
        JSON.stringify({
          action: "publishing:entries-content-update",
          data: { entries: restoredCollectionMove.publishingContent }
        })
      );
    } catch (error) {
      console.error("Failed to publish restored collection location", {
        error,
        migrationID: input.migrationID
      });
    }
  }
  const rolledBackEntries = await db
    .select({ entryID: schemaMigrationEntries.entryID })
    .from(schemaMigrationEntries)
    .where(
      and(
        eq(schemaMigrationEntries.migrationID, input.migrationID),
        eq(schemaMigrationEntries.status, "rolled_back")
      )
    );

  await publishMigrationStatus(
    {
      collectionIDs: input.collectionIDs,
      migrationID: input.migrationID,
      schemaID: input.schemaID,
      processedEntries: input.processedEntries,
      status: "failed",
      totalEntries: input.totalEntries,
      workspaceID: input.workspaceID
    },
    dependencies.publish
  );

  return [
    ...new Set([
      ...rolledBackEntries.map(({ entryID }) => entryID),
      ...(restoredMove ? [toUUID(restoredMove.move.id)] : []),
      ...(restoredCollectionMove?.entryIDs || [])
    ])
  ];
};
const reconcileFailedSchemaMigrationJob = async (
  input: ReconcileFailedSchemaMigrationJobInput,
  dependencies: SchemaMigrationDependencies
): Promise<void> => {
  const migrationID = toUUID(input.migrationID);
  const workspaceID = toUUID(input.workspaceID);
  const [migration] = await db
    .select()
    .from(schemaMigrations)
    .where(
      and(eq(schemaMigrations.id, migrationID), eq(schemaMigrations.workspaceID, workspaceID))
    );

  if (!migration || migration.status === "failed") return;

  if (migration.status === "completed") {
    const changedEntryIDs = [
      ...(await getChangedCompletedEntryIDs(migrationID)),
      ...(migration.entryMove ? [migration.entryMove.entryID] : []),
      ...(migration.collectionMove?.entryIDs || [])
    ];

    await publishSchemaDeletion(migration, dependencies.publish);
    await enqueueEntrySync(changedEntryIDs, workspaceID, dependencies.queue);
    await publishMigrationRecoveryVersionEvents(migrationID, workspaceID, dependencies.publish);
    return;
  }

  const collectionRows = await db
    .select({ collectionID: schemaMigrationCollections.collectionID })
    .from(schemaMigrationCollections)
    .where(eq(schemaMigrationCollections.migrationID, migrationID));
  const rolledBackEntryIDs = await failMigration(
    {
      collectionIDs: collectionRows.map(({ collectionID }) => collectionID),
      entryID: null,
      error: input.error,
      migrationID,
      schemaID: migration.schemaID,
      processedEntries: migration.processedEntries,
      totalEntries: migration.totalEntries,
      workspaceID
    },
    dependencies
  );

  await enqueueEntrySync(rolledBackEntryIDs, workspaceID, dependencies.queue);
};
const executeSchemaMigration = async (
  input: ExecuteSchemaMigrationInput,
  dependencies: SchemaMigrationDependencies
): Promise<void> => {
  const migrationID = toUUID(input.migrationID);
  const workspaceID = toUUID(input.workspaceID);
  const [migration] = await db
    .select()
    .from(schemaMigrations)
    .where(
      and(eq(schemaMigrations.id, migrationID), eq(schemaMigrations.workspaceID, workspaceID))
    );

  if (!migration || migration.status === "failed") return;

  if (migration.status === "completed") {
    const changedEntryIDs = [
      ...(await getChangedCompletedEntryIDs(migrationID)),
      ...(migration.entryMove ? [migration.entryMove.entryID] : []),
      ...(migration.collectionMove?.entryIDs || [])
    ];

    await publishSchemaDeletion(migration, dependencies.publish);
    await enqueueEntrySync(changedEntryIDs, workspaceID, dependencies.queue);
    return;
  }

  const collectionRows = await db
    .select({ collectionID: schemaMigrationCollections.collectionID })
    .from(schemaMigrationCollections)
    .where(eq(schemaMigrationCollections.migrationID, migrationID));
  const collectionIDs = collectionRows.map(({ collectionID }) => collectionID);

  if (migration.status === "rolling_back") {
    const rolledBackEntryIDs = await failMigration(
      {
        collectionIDs,
        entryID: null,
        error: new Error(migration.error || "Schema migration rollback was interrupted"),
        migrationID,
        schemaID: migration.schemaID,
        processedEntries: migration.processedEntries,
        totalEntries: migration.totalEntries,
        workspaceID
      },
      dependencies
    );

    await enqueueEntrySync(rolledBackEntryIDs, workspaceID, dependencies.queue);
    return;
  }

  await db
    .update(schemaMigrations)
    .set({
      status: "running",
      jobID: input.jobID,
      error: null,
      startedAt: migration.startedAt || new Date(),
      updatedAt: new Date()
    })
    .where(eq(schemaMigrations.id, migrationID));
  await publishMigrationStatus(
    {
      collectionIDs,
      migrationID,
      schemaID: migration.schemaID,
      processedEntries: migration.processedEntries,
      status: "running",
      totalEntries: migration.totalEntries,
      workspaceID
    },
    dependencies.publish
  );

  const changedEntryIDs = [
    ...(await getChangedCompletedEntryIDs(migrationID)),
    ...(migration.entryMove ? [migration.entryMove.entryID] : []),
    ...(migration.collectionMove?.entryIDs || [])
  ];
  const entryRows = await db
    .select({ entryID: schemaMigrationEntries.entryID })
    .from(schemaMigrationEntries)
    .where(
      and(
        eq(schemaMigrationEntries.migrationID, migrationID),
        eq(schemaMigrationEntries.status, "queued")
      )
    );
  let processedEntries = migration.processedEntries;
  let currentEntryID: string | null = null;

  try {
    for (const entry of entryRows) {
      currentEntryID = entry.entryID;

      const result = await processMigrationEntry({
        entryID: entry.entryID,
        migrationID,
        workspaceID
      });

      if (result.processed) {
        processedEntries += 1;

        if (result.changed) changedEntryIDs.push(result.entryID);

        await publishMigrationStatus(
          {
            collectionIDs,
            migrationID,
            schemaID: migration.schemaID,
            processedEntries,
            status: "running",
            totalEntries: migration.totalEntries,
            workspaceID
          },
          dependencies.publish
        );
      }

      currentEntryID = null;
    }

    await activateMigration(migrationID, workspaceID);
    await publishSchemaDeletion(migration, dependencies.publish);
    await enqueueEntrySync(changedEntryIDs, workspaceID, dependencies.queue);
    await publishMigrationRecoveryVersionEvents(migrationID, workspaceID, dependencies.publish);
    await publishMigrationStatus(
      {
        collectionIDs,
        migrationID,
        schemaID: migration.schemaID,
        processedEntries: migration.totalEntries,
        status: "completed",
        totalEntries: migration.totalEntries,
        workspaceID
      },
      dependencies.publish
    );
  } catch (error) {
    if (!input.rollbackOnFailure) throw error;

    const rolledBackEntryIDs = await failMigration(
      {
        collectionIDs,
        entryID: currentEntryID,
        error,
        migrationID,
        schemaID: migration.schemaID,
        processedEntries,
        totalEntries: migration.totalEntries,
        workspaceID
      },
      dependencies
    );

    await enqueueEntrySync(rolledBackEntryIDs, workspaceID, dependencies.queue);
  }
};

export { executeSchemaMigration, reconcileFailedSchemaMigrationJob };
export type { SchemaMigrationDependencies };
