import {
  effectiveSchemaRevisions,
  schemaMigrationEntries,
  schemaMigrations
} from "@andesine/backend/db/content-schemas";
import { contents } from "@andesine/backend/db/contents";
import { entries } from "@andesine/backend/db/entries";
import {
  entryVersionActivity,
  entryVersionActivityContributors,
  entryVersionContributors,
  entryVersions
} from "@andesine/backend/db/versions";
import type { ContentNode } from "@andesine/backend/lib/content";
import {
  migrateSchemaContentState,
  replaceSchemaContentState
} from "@andesine/backend/lib/schema/migration";
import { getResolvedSchemaDefinition } from "@andesine/backend/lib/schema/inheritance";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../database";

interface MigrationEntryInput {
  entryID: string;
  migrationID: string;
  workspaceID: string;
}
interface ProcessMigrationEntryResult {
  changed: boolean;
  entryID: string;
  processed: boolean;
}

const createEmptyDocument = (name: string): ContentNode => ({
  type: "doc",
  content: [
    { type: "title", content: name ? [{ type: "text", text: name }] : undefined },
    { type: "paragraph" }
  ]
});
const processMigrationEntry = async (
  input: MigrationEntryInput
): Promise<ProcessMigrationEntryResult> => {
  return db.transaction(async (transaction) => {
    const [row] = await transaction
      .select({
        entryName: entries.name,
        migrationStatus: schemaMigrations.status,
        initiatedBy: schemaMigrations.initiatedBy,
        entryStatus: schemaMigrationEntries.status,
        document: contents.document,
        state: contents.state,
        schemaRevisionID: contents.schemaRevisionID,
        targetRevisionID: schemaMigrationEntries.targetRevisionID,
        targetDefinition: effectiveSchemaRevisions.definition
      })
      .from(schemaMigrationEntries)
      .innerJoin(
        schemaMigrations,
        and(
          eq(schemaMigrations.workspaceID, schemaMigrationEntries.workspaceID),
          eq(schemaMigrations.id, schemaMigrationEntries.migrationID)
        )
      )
      .innerJoin(
        entries,
        and(
          eq(entries.workspaceID, schemaMigrationEntries.workspaceID),
          eq(entries.id, schemaMigrationEntries.entryID)
        )
      )
      .leftJoin(contents, eq(contents.entryID, schemaMigrationEntries.entryID))
      .innerJoin(
        effectiveSchemaRevisions,
        eq(effectiveSchemaRevisions.id, schemaMigrationEntries.targetRevisionID)
      )
      .where(
        and(
          eq(schemaMigrationEntries.workspaceID, input.workspaceID),
          eq(schemaMigrationEntries.migrationID, input.migrationID),
          eq(schemaMigrationEntries.entryID, input.entryID)
        )
      )
      .for("update", { of: [schemaMigrationEntries, entries] });

    if (!row || row.migrationStatus !== "running" || row.entryStatus !== "queued") {
      return { changed: false, entryID: input.entryID, processed: false };
    }

    if (!row.targetRevisionID) throw new Error("Schema migration target revision is missing");

    const sourceDocument = row.document || createEmptyDocument(row.entryName);
    const migrated = migrateSchemaContentState({
      document: sourceDocument,
      schema: getResolvedSchemaDefinition(row.targetDefinition),
      state: row.state
    });
    const activityContributors = await transaction
      .select({ membershipID: entryVersionActivityContributors.membershipID })
      .from(entryVersionActivityContributors)
      .where(eq(entryVersionActivityContributors.entryID, input.entryID));
    const contributorIDs = [
      ...new Set([
        ...activityContributors.map(({ membershipID }) => membershipID),
        ...(row.initiatedBy ? [row.initiatedBy] : [])
      ])
    ];
    const [recoveryVersion] = await transaction
      .insert(entryVersions)
      .values({
        workspaceID: input.workspaceID,
        entryID: input.entryID,
        entryName: row.entryName,
        document: migrated.previousDocument,
        hash: migrated.previousHash,
        schemaRevisionID: row.schemaRevisionID,
        reason: "schema-migration"
      })
      .returning({ id: entryVersions.id });

    if (contributorIDs.length > 0) {
      await transaction.insert(entryVersionContributors).values(
        contributorIDs.map((membershipID) => ({
          workspaceID: input.workspaceID,
          versionID: recoveryVersion.id,
          membershipID
        }))
      );
    }

    await transaction
      .insert(contents)
      .values({
        workspaceID: input.workspaceID,
        entryID: input.entryID,
        state: migrated.state,
        document: migrated.document,
        hash: migrated.hash,
        schemaRevisionID: row.targetRevisionID,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: contents.entryID,
        set: {
          state: migrated.state,
          document: migrated.document,
          hash: migrated.hash,
          schemaRevisionID: row.targetRevisionID,
          updatedAt: new Date()
        }
      });
    await transaction
      .delete(entryVersionActivity)
      .where(eq(entryVersionActivity.entryID, input.entryID));
    await transaction
      .update(schemaMigrationEntries)
      .set({
        status: "completed",
        contentLost: migrated.contentLost,
        recoveryVersionID: recoveryVersion.id,
        sourceHash: migrated.previousHash,
        targetHash: migrated.hash,
        error: null,
        startedAt: new Date(),
        completedAt: new Date()
      })
      .where(
        and(
          eq(schemaMigrationEntries.migrationID, input.migrationID),
          eq(schemaMigrationEntries.entryID, input.entryID)
        )
      );
    await transaction
      .update(schemaMigrations)
      .set({
        processedEntries: sql`${schemaMigrations.processedEntries} + 1`,
        updatedAt: new Date()
      })
      .where(eq(schemaMigrations.id, input.migrationID));

    return {
      changed: migrated.changed,
      entryID: input.entryID,
      processed: true
    };
  });
};
const rollbackMigrationEntry = async (input: MigrationEntryInput): Promise<void> => {
  return db.transaction(async (transaction) => {
    const [row] = await transaction
      .select({
        contentState: contents.state,
        entryStatus: schemaMigrationEntries.status,
        recoveryDocument: entryVersions.document,
        recoveryHash: entryVersions.hash,
        recoveryRevisionID: entryVersions.schemaRevisionID
      })
      .from(schemaMigrationEntries)
      .innerJoin(entryVersions, eq(entryVersions.id, schemaMigrationEntries.recoveryVersionID))
      .innerJoin(contents, eq(contents.entryID, schemaMigrationEntries.entryID))
      .where(
        and(
          eq(schemaMigrationEntries.workspaceID, input.workspaceID),
          eq(schemaMigrationEntries.migrationID, input.migrationID),
          eq(schemaMigrationEntries.entryID, input.entryID)
        )
      )
      .for("update");

    if (!row) throw new Error("Schema migration recovery content is missing");
    if (row.entryStatus !== "completed") return;

    const restored = replaceSchemaContentState(row.contentState, row.recoveryDocument);

    await transaction
      .update(contents)
      .set({
        state: restored.state,
        document: restored.document,
        hash: row.recoveryHash,
        schemaRevisionID: row.recoveryRevisionID,
        updatedAt: new Date()
      })
      .where(eq(contents.entryID, input.entryID));
    await transaction
      .update(schemaMigrationEntries)
      .set({
        status: "rolled_back",
        targetHash: row.recoveryHash,
        completedAt: new Date()
      })
      .where(
        and(
          eq(schemaMigrationEntries.migrationID, input.migrationID),
          eq(schemaMigrationEntries.entryID, input.entryID)
        )
      );
  });
};

export { processMigrationEntry, rollbackMigrationEntry };
export type { ProcessMigrationEntryResult };
