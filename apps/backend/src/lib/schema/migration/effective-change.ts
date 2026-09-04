import {
  collectionSchemas,
  collections,
  contents,
  effectiveSchemaRevisions,
  entries,
  schemaMigrationCollections,
  schemaMigrationEntries,
  schemaMigrations,
  schemaVersions
} from "#backend/db";
import type { Database } from "#backend/lib/policy";
import { hashSchemaDefinition, hashSchemaValue } from "../contract";
import {
  getCollectionSourceChain,
  getCollectionSubtreeIDs,
  getResolvedSchemaDefinition,
  resolveEffectiveSchema,
  type SchemaDefinitionSource,
  type ResolvedSchemaDefinition
} from "../inheritance";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";

interface CreateEffectiveSchemaChangeInput {
  database: Database;
  excludedSchemaIDs?: string[];
  initiatedBy: string | null;
  rootCollectionIDs: string[];
  schemaID: string | null;
  schemaVersionID: string | null;
  sourceOverrides?: SchemaDefinitionSource[];
  workspaceID: string;
}
interface EffectiveSchemaChangePlan {
  affectedCollectionIDs: string[];
  migrationID: string | null;
  totalEntries: number;
}
interface PlannedCollectionRevision {
  collectionID: string;
  currentRevisionID: string | null;
  definition: ResolvedSchemaDefinition | null;
  hash: string | null;
  migrateEntries: boolean;
}

const createEffectiveSchemaChange = async (
  input: CreateEffectiveSchemaChangeInput
): Promise<EffectiveSchemaChangePlan> => {
  const collectionRows = await input.database
    .select()
    .from(collections)
    .where(and(eq(collections.workspaceID, input.workspaceID), isNull(collections.deletedAt)));
  const collectionsByID = new Map(collectionRows.map((collection) => [collection.id, collection]));
  const affectedCollectionIDs = [
    ...new Set(
      input.rootCollectionIDs.flatMap((collectionID) => {
        return getCollectionSubtreeIDs(collectionID, collectionRows);
      })
    )
  ];

  if (affectedCollectionIDs.length === 0) {
    return { affectedCollectionIDs: [], migrationID: null, totalEntries: 0 };
  }

  const [activeMigration] = await input.database
    .select({ id: schemaMigrations.id })
    .from(schemaMigrationCollections)
    .innerJoin(
      schemaMigrations,
      and(
        eq(schemaMigrations.workspaceID, schemaMigrationCollections.workspaceID),
        eq(schemaMigrations.id, schemaMigrationCollections.migrationID)
      )
    )
    .where(
      and(
        eq(schemaMigrationCollections.workspaceID, input.workspaceID),
        inArray(schemaMigrationCollections.collectionID, affectedCollectionIDs),
        inArray(schemaMigrations.status, ["queued", "running", "rolling_back"])
      )
    )
    .limit(1);

  if (activeMigration) {
    throw new ORPCError("CONFLICT", {
      message: "A schema migration is already in progress for this collection"
    });
  }

  const activeSourceRows = await input.database
    .select({
      collectionID: collectionSchemas.collectionID,
      schemaID: collectionSchemas.id,
      versionID: schemaVersions.id,
      definition: schemaVersions.definition
    })
    .from(collectionSchemas)
    .innerJoin(
      schemaVersions,
      and(
        eq(schemaVersions.workspaceID, collectionSchemas.workspaceID),
        eq(schemaVersions.schemaID, collectionSchemas.id),
        eq(schemaVersions.active, true)
      )
    )
    .where(
      and(eq(collectionSchemas.workspaceID, input.workspaceID), eq(collectionSchemas.enabled, true))
    );
  const sourcesByCollectionID = new Map<string, SchemaDefinitionSource>(
    activeSourceRows
      .filter((row) => !input.excludedSchemaIDs?.includes(row.schemaID))
      .map((row) => [row.collectionID, row])
  );

  for (const source of input.sourceOverrides || []) {
    sourcesByCollectionID.set(source.collectionID, source);
  }

  const currentRevisions = await input.database
    .select()
    .from(effectiveSchemaRevisions)
    .where(
      and(
        eq(effectiveSchemaRevisions.workspaceID, input.workspaceID),
        inArray(effectiveSchemaRevisions.collectionID, affectedCollectionIDs),
        eq(effectiveSchemaRevisions.active, true)
      )
    );
  const currentRevisionByCollectionID = new Map(
    currentRevisions.map((revision) => [revision.collectionID, revision])
  );
  const plannedRevisions: PlannedCollectionRevision[] = [];

  for (const collectionID of affectedCollectionIDs) {
    const definition = resolveEffectiveSchema({
      collectionID,
      sources: getCollectionSourceChain(collectionID, collectionsByID, sourcesByCollectionID)
    });
    const currentRevision = currentRevisionByCollectionID.get(collectionID);
    const revisionChanged = definition
      ? !currentRevision ||
        hashSchemaValue(currentRevision.definition) !== hashSchemaValue(definition)
      : Boolean(currentRevision);

    if (!revisionChanged) continue;

    const hash = definition ? hashSchemaDefinition(getResolvedSchemaDefinition(definition)) : null;

    plannedRevisions.push({
      collectionID,
      currentRevisionID: currentRevision?.id || null,
      definition,
      hash,
      migrateEntries: Boolean(definition && (!currentRevision || currentRevision.hash !== hash))
    });
  }

  if (plannedRevisions.length === 0) {
    return { affectedCollectionIDs: [], migrationID: null, totalEntries: 0 };
  }

  const definedRevisions = plannedRevisions.filter(
    (
      revision
    ): revision is PlannedCollectionRevision & {
      definition: ResolvedSchemaDefinition;
      hash: string;
    } => Boolean(revision.definition && revision.hash)
  );
  const targetRevisions =
    definedRevisions.length > 0
      ? await input.database
          .insert(effectiveSchemaRevisions)
          .values(
            definedRevisions.map((revision) => ({
              workspaceID: input.workspaceID,
              collectionID: revision.collectionID,
              definition: revision.definition,
              hash: revision.hash,
              active: false
            }))
          )
          .returning({
            id: effectiveSchemaRevisions.id,
            collectionID: effectiveSchemaRevisions.collectionID
          })
      : [];
  const targetRevisionByCollectionID = new Map(
    targetRevisions.map((revision) => [revision.collectionID, revision.id])
  );

  if (definedRevisions.length === 0) {
    const disabledCollectionIDs = plannedRevisions.map(({ collectionID }) => collectionID);
    const disabledEntryIDs = input.database
      .select({ id: entries.id })
      .from(entries)
      .where(
        and(
          eq(entries.workspaceID, input.workspaceID),
          inArray(entries.collectionID, disabledCollectionIDs),
          isNull(entries.deletedAt)
        )
      );

    await input.database
      .update(effectiveSchemaRevisions)
      .set({ active: false })
      .where(
        and(
          eq(effectiveSchemaRevisions.workspaceID, input.workspaceID),
          inArray(effectiveSchemaRevisions.collectionID, disabledCollectionIDs),
          eq(effectiveSchemaRevisions.active, true)
        )
      );
    await input.database
      .update(contents)
      .set({ schemaRevisionID: null, updatedAt: new Date() })
      .where(inArray(contents.entryID, disabledEntryIDs));

    return {
      affectedCollectionIDs: disabledCollectionIDs,
      migrationID: null,
      totalEntries: 0
    };
  }

  const [migration] = await input.database
    .insert(schemaMigrations)
    .values({
      workspaceID: input.workspaceID,
      schemaID: input.schemaID,
      schemaVersionID: input.schemaVersionID,
      status: "queued",
      initiatedBy: input.initiatedBy
    })
    .returning();

  await input.database.insert(schemaMigrationCollections).values(
    plannedRevisions.map((revision) => ({
      workspaceID: input.workspaceID,
      migrationID: migration.id,
      collectionID: revision.collectionID,
      sourceRevisionID: revision.currentRevisionID,
      targetRevisionID: targetRevisionByCollectionID.get(revision.collectionID) || null
    }))
  );

  const migratingCollectionIDs = plannedRevisions
    .filter(({ migrateEntries }) => migrateEntries)
    .map(({ collectionID }) => collectionID);
  const entryRows =
    migratingCollectionIDs.length > 0
      ? await input.database
          .select({
            entryID: entries.id,
            collectionID: entries.collectionID,
            sourceHash: contents.hash,
            sourceRevisionID: contents.schemaRevisionID
          })
          .from(entries)
          .leftJoin(contents, eq(contents.entryID, entries.id))
          .where(
            and(
              eq(entries.workspaceID, input.workspaceID),
              inArray(entries.collectionID, migratingCollectionIDs),
              isNull(entries.deletedAt)
            )
          )
      : [];

  if (entryRows.length > 0) {
    await input.database.insert(schemaMigrationEntries).values(
      entryRows.map((entry) => ({
        workspaceID: input.workspaceID,
        migrationID: migration.id,
        entryID: entry.entryID,
        sourceRevisionID: entry.sourceRevisionID,
        targetRevisionID: targetRevisionByCollectionID.get(entry.collectionID!)!,
        sourceHash: entry.sourceHash
      }))
    );
  }

  await input.database
    .update(schemaMigrations)
    .set({ totalEntries: entryRows.length, updatedAt: new Date() })
    .where(eq(schemaMigrations.id, migration.id));

  return {
    affectedCollectionIDs: plannedRevisions.map(({ collectionID }) => collectionID),
    migrationID: migration.id,
    totalEntries: entryRows.length
  };
};

export { createEffectiveSchemaChange };
export type { CreateEffectiveSchemaChangeInput, EffectiveSchemaChangePlan };
