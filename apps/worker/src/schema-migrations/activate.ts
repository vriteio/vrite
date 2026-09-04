import {
  collectionSchemas,
  effectiveSchemaRevisions,
  schemaMigrationCollections,
  schemaMigrationEntries,
  schemaMigrations,
  schemaVersions
} from "@andesine/backend/db/content-schemas";
import { contents } from "@andesine/backend/db/contents";
import { entries } from "@andesine/backend/db/entries";
import { entryPublications } from "@andesine/backend/db/publishing";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "../database";

const activateMigration = async (migrationID: string, workspaceID: string): Promise<void> => {
  await db.transaction(async (transaction) => {
    const [migration] = await transaction
      .select()
      .from(schemaMigrations)
      .where(
        and(eq(schemaMigrations.id, migrationID), eq(schemaMigrations.workspaceID, workspaceID))
      )
      .for("update");

    if (!migration || migration.status !== "running") {
      throw new Error("Schema migration is not ready for activation");
    }

    const [incompleteEntry] = await transaction
      .select({ entryID: schemaMigrationEntries.entryID })
      .from(schemaMigrationEntries)
      .where(
        and(
          eq(schemaMigrationEntries.migrationID, migrationID),
          ne(schemaMigrationEntries.status, "completed")
        )
      )
      .limit(1);

    if (incompleteEntry) throw new Error("Schema migration has incomplete entries");

    const collectionRows = await transaction
      .select({
        collectionID: schemaMigrationCollections.collectionID,
        targetRevisionID: schemaMigrationCollections.targetRevisionID
      })
      .from(schemaMigrationCollections)
      .where(eq(schemaMigrationCollections.migrationID, migrationID));
    const collectionIDs = collectionRows.map(({ collectionID }) => collectionID);
    const targetRevisionIDs = collectionRows.flatMap(({ targetRevisionID }) => {
      return targetRevisionID ? [targetRevisionID] : [];
    });

    if (collectionIDs.length > 0) {
      await transaction
        .update(effectiveSchemaRevisions)
        .set({ active: false })
        .where(
          and(
            eq(effectiveSchemaRevisions.workspaceID, workspaceID),
            inArray(effectiveSchemaRevisions.collectionID, collectionIDs),
            eq(effectiveSchemaRevisions.active, true)
          )
        );
      if (targetRevisionIDs.length > 0) {
        await transaction
          .update(effectiveSchemaRevisions)
          .set({ active: true })
          .where(inArray(effectiveSchemaRevisions.id, targetRevisionIDs));
      }
    }

    for (const collection of collectionRows) {
      const collectionEntryIDs = transaction
        .select({ id: entries.id })
        .from(entries)
        .where(
          and(
            eq(entries.workspaceID, workspaceID),
            eq(entries.collectionID, collection.collectionID),
            isNull(entries.deletedAt)
          )
        );

      await transaction
        .update(contents)
        .set({ schemaRevisionID: collection.targetRevisionID, updatedAt: new Date() })
        .where(inArray(contents.entryID, collectionEntryIDs));
    }

    if (migration.schemaID) {
      await transaction
        .update(schemaVersions)
        .set({ active: false, updatedAt: new Date() })
        .where(
          and(eq(schemaVersions.schemaID, migration.schemaID), eq(schemaVersions.active, true))
        );
      if (migration.schemaVersionID) {
        await transaction
          .update(schemaVersions)
          .set({ active: true, updatedAt: new Date() })
          .where(eq(schemaVersions.id, migration.schemaVersionID));
      } else {
        await transaction
          .update(collectionSchemas)
          .set({ enabled: false, updatedAt: new Date() })
          .where(eq(collectionSchemas.id, migration.schemaID));
      }
    }

    const unpublishEntryIDs = [
      ...(migration.entryMove?.unpublishOnCompletion ? [migration.entryMove.entryID] : []),
      ...(migration.collectionMove?.unpublishEntryIDs || [])
    ];

    if (unpublishEntryIDs.length > 0) {
      await transaction
        .delete(entryPublications)
        .where(
          and(
            eq(entryPublications.workspaceID, workspaceID),
            inArray(entryPublications.entryID, unpublishEntryIDs)
          )
        );
    }

    await transaction
      .update(schemaMigrations)
      .set({
        status: "completed",
        processedEntries: migration.totalEntries,
        error: null,
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(schemaMigrations.id, migrationID));
  });
};

export { activateMigration };
