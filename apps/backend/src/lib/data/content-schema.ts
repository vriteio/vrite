import type {
  collectionSchemas,
  effectiveSchemaRevisions,
  schemaMigrations,
  schemaVersions
} from "#backend/db";
import { contentNodeType, type ContentNode } from "#backend/lib/content";
import {
  id,
  toCollectionID,
  toMembershipID,
  toSchemaID,
  toSchemaMigrationID,
  toSchemaRevisionID,
  toSchemaVersionID
} from "#backend/lib/primitives";
import {
  schemaDefinitionType,
  schemaDraftDefinitionType,
  type SchemaDefinition
} from "#backend/lib/schema/contract";
import { createSchemaEditorDocument } from "#backend/lib/schema/editor";
import {
  resolvedSchemaDefinitionType,
  type ResolvedSchemaDefinition
} from "#backend/lib/schema/inheritance";
import * as z from "zod";
import { versionReasonType, type VersionReason } from "./entry-version";

interface SchemaVersionSummary {
  id: string;
  schemaID: string;
  collectionID: string;
  version: number;
  hash: string;
  name: string | null;
  reason: VersionReason;
  sourceVersionID: string | null;
  active: boolean;
  appliedBy: string | null;
  contributorIDs: string[];
  createdAt: string;
  updatedAt: string;
}
interface SchemaVersionDetails extends SchemaVersionSummary {
  definition: SchemaDefinition;
  document: ContentNode;
}
interface LocalCollectionSchema {
  id: string;
  collectionID: string;
  enabled: boolean;
  draft: SchemaDefinition | null;
  draftDocument: ContentNode | null;
  draftHash: string | null;
  hasUnappliedChanges: boolean;
  activeVersion: SchemaVersionSummary | null;
  createdAt: string;
  updatedAt: string;
}
interface EffectiveCollectionSchema {
  id: string;
  collectionID: string;
  definition: ResolvedSchemaDefinition;
  document: ContentNode;
  hash: string;
  inherited: boolean;
  createdAt: string;
}
interface CollectionSchemaDetails {
  local: LocalCollectionSchema | null;
  effective: EffectiveCollectionSchema | null;
}
interface SchemaApplicationResult {
  changed: boolean;
  migrationID: string | null;
  schemaVersionID: string;
  affectedCollectionIDs: string[];
  totalEntries: number;
}
interface SchemaMigrationContentLossEntry {
  id: string;
  collectionID: string;
  name: string;
}
interface SchemaMigrationDetails {
  id: string;
  schemaID: string | null;
  schemaVersionID: string | null;
  status: SchemaMigrationStatus;
  totalEntries: number;
  processedEntries: number;
  contentLossEntries: SchemaMigrationContentLossEntry[];
  error: string | null;
  initiatedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
interface MapLocalCollectionSchemaInput {
  row: CollectionSchemaRow;
  activeVersion: SchemaVersionSummary | null;
}

type CollectionSchemaRow = typeof collectionSchemas.$inferSelect;
type EffectiveSchemaRevisionRow = typeof effectiveSchemaRevisions.$inferSelect;
type SchemaMigrationRow = typeof schemaMigrations.$inferSelect;
type SchemaMigrationStatus = SchemaMigrationRow["status"];
type SchemaVersionRow = typeof schemaVersions.$inferSelect;

const schemaVersionSummaryType = z.object({
  id: id().describe("ID of the schema version"),
  schemaID: id().describe("ID of the local collection schema"),
  collectionID: id().describe("ID of the collection"),
  version: z.number().int().positive().describe("Sequential schema version number"),
  hash: z.string().length(64).describe("Hash of the schema definition"),
  name: z.string().nullable().describe("Optional schema version name"),
  reason: versionReasonType.describe("Reason why the schema version was created"),
  sourceVersionID: id().nullable().describe("Source version used for a revert"),
  active: z.boolean().describe("Whether this is the active local schema version"),
  appliedBy: id().nullable().describe("Membership that applied the schema version"),
  contributorIDs: z.array(id()).describe("Memberships that contributed to the schema version"),
  createdAt: z.iso.datetime().describe("Time when the schema version was created"),
  updatedAt: z.iso.datetime().describe("Time when the schema version name was last updated")
});
const schemaVersionDetailsType = schemaVersionSummaryType.extend({
  definition: schemaDefinitionType.describe("Local schema definition stored in the version"),
  document: contentNodeType.describe("Schema definition projected as an editor document")
});
const localCollectionSchemaType = z.object({
  id: id().describe("ID of the local collection schema"),
  collectionID: id().describe("ID of the collection"),
  enabled: z.boolean().describe("Whether the collection currently defines a local schema"),
  draft: schemaDraftDefinitionType.nullable().describe("Current local schema draft"),
  draftDocument: contentNodeType
    .nullable()
    .describe("Current draft projected as an editor document"),
  draftHash: z.string().length(64).nullable().describe("Hash of the current local schema draft"),
  hasUnappliedChanges: z.boolean().describe("Whether the draft differs from the active version"),
  activeVersion: schemaVersionSummaryType.nullable(),
  createdAt: z.iso.datetime().describe("Time when the local schema was first created"),
  updatedAt: z.iso.datetime().describe("Time when the local schema draft was last updated")
});
const effectiveCollectionSchemaType = z.object({
  id: id().describe("ID of the effective schema revision"),
  collectionID: id().describe("ID of the collection"),
  definition: resolvedSchemaDefinitionType.describe("Effective inherited schema definition"),
  document: contentNodeType.describe("Effective schema projected as an editor document"),
  hash: z.string().length(64).describe("Hash of the effective schema definition"),
  inherited: z.boolean().describe("Whether the effective schema is fully inherited"),
  createdAt: z.iso.datetime().describe("Time when the effective revision was created")
});
const collectionSchemaDetailsType = z.object({
  local: localCollectionSchemaType.nullable(),
  effective: effectiveCollectionSchemaType.nullable()
});
const schemaApplicationResultType = z.object({
  changed: z.boolean().describe("Whether a new schema version was created for application"),
  migrationID: id()
    .nullable()
    .describe("ID of the migration, or null when entry conversion is not needed"),
  schemaVersionID: id().describe("ID of the schema version associated with the application"),
  affectedCollectionIDs: z.array(id()).describe("Collections affected by the effective schema"),
  totalEntries: z.number().int().nonnegative().describe("Entries that require content migration")
});
const schemaMigrationStatusType = z.enum([
  "queued",
  "running",
  "rolling_back",
  "completed",
  "failed"
]);
const schemaMigrationContentLossEntryType = z.object({
  id: id().describe("ID of an entry that lost content"),
  collectionID: id().describe("ID of the entry collection"),
  name: z.string().describe("Current entry name")
});
const schemaMigrationDetailsType = z.object({
  id: id().describe("ID of the schema migration"),
  schemaID: id().nullable().describe("Local schema that initiated the migration"),
  schemaVersionID: id().nullable().describe("Schema version applied by the migration"),
  status: schemaMigrationStatusType,
  totalEntries: z.number().int().nonnegative(),
  processedEntries: z.number().int().nonnegative(),
  contentLossEntries: z.array(schemaMigrationContentLossEntryType),
  error: z.string().nullable(),
  initiatedBy: id().nullable(),
  startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

const mapResolvedSchemaDefinition = (
  definition: ResolvedSchemaDefinition
): ResolvedSchemaDefinition => ({
  ...definition,
  fields: definition.fields.map((field) => ({
    ...field,
    source: {
      ...field.source,
      collectionID: toCollectionID(field.source.collectionID),
      schemaID: toSchemaID(field.source.schemaID),
      versionID: toSchemaVersionID(field.source.versionID)
    }
  })),
  sourceVersionIDs: definition.sourceVersionIDs.map(toSchemaVersionID)
});
const mapSchemaVersionSummary = (
  row: SchemaVersionRow,
  collectionID: string,
  contributorIDs: string[]
): SchemaVersionSummary => ({
  id: toSchemaVersionID(row.id),
  schemaID: toSchemaID(row.schemaID),
  collectionID: toCollectionID(collectionID),
  version: row.version,
  hash: row.hash,
  name: row.name,
  reason: row.reason,
  sourceVersionID: row.sourceVersionID ? toSchemaVersionID(row.sourceVersionID) : null,
  active: row.active,
  appliedBy: row.appliedBy ? toMembershipID(row.appliedBy) : null,
  contributorIDs: contributorIDs.map(toMembershipID),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});
const mapSchemaVersion = (
  row: SchemaVersionRow,
  collectionID: string,
  contributorIDs: string[]
): SchemaVersionDetails => ({
  ...mapSchemaVersionSummary(row, collectionID, contributorIDs),
  definition: row.definition,
  document: createSchemaEditorDocument(row.definition)
});
const toSchemaVersionSummary = ({
  definition: _definition,
  document: _document,
  ...version
}: SchemaVersionDetails): SchemaVersionSummary => version;
const mapLocalCollectionSchema = ({
  row,
  activeVersion
}: MapLocalCollectionSchemaInput): LocalCollectionSchema => ({
  id: toSchemaID(row.id),
  collectionID: toCollectionID(row.collectionID),
  enabled: row.enabled,
  draft: row.draftDocument,
  draftDocument: row.draftDocument ? createSchemaEditorDocument(row.draftDocument) : null,
  draftHash: row.draftHash,
  hasUnappliedChanges: Boolean(
    row.draftHash && (!activeVersion || row.draftHash !== activeVersion.hash)
  ),
  activeVersion,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});
const mapEffectiveCollectionSchema = (
  row: EffectiveSchemaRevisionRow,
  inherited: boolean
): EffectiveCollectionSchema => {
  const definition = mapResolvedSchemaDefinition(row.definition);

  return {
    id: toSchemaRevisionID(row.id),
    collectionID: toCollectionID(row.collectionID),
    definition,
    document: createSchemaEditorDocument(definition),
    hash: row.hash,
    inherited,
    createdAt: row.createdAt.toISOString()
  };
};
const mapSchemaMigration = (
  row: SchemaMigrationRow,
  contentLossEntries: SchemaMigrationContentLossEntry[]
): SchemaMigrationDetails => ({
  id: toSchemaMigrationID(row.id),
  schemaID: row.schemaID ? toSchemaID(row.schemaID) : null,
  schemaVersionID: row.schemaVersionID ? toSchemaVersionID(row.schemaVersionID) : null,
  status: row.status,
  totalEntries: row.totalEntries,
  processedEntries: row.processedEntries,
  contentLossEntries,
  error: row.error,
  initiatedBy: row.initiatedBy ? toMembershipID(row.initiatedBy) : null,
  startedAt: row.startedAt?.toISOString() || null,
  completedAt: row.completedAt?.toISOString() || null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString()
});

export {
  collectionSchemaDetailsType,
  effectiveCollectionSchemaType,
  localCollectionSchemaType,
  mapEffectiveCollectionSchema,
  mapLocalCollectionSchema,
  mapSchemaMigration,
  mapSchemaVersion,
  mapSchemaVersionSummary,
  schemaApplicationResultType,
  schemaMigrationDetailsType,
  schemaMigrationStatusType,
  schemaVersionDetailsType,
  schemaVersionSummaryType,
  toSchemaVersionSummary
};
export type {
  CollectionSchemaDetails,
  EffectiveCollectionSchema,
  LocalCollectionSchema,
  SchemaApplicationResult,
  SchemaMigrationContentLossEntry,
  SchemaMigrationDetails,
  SchemaMigrationStatus,
  SchemaVersionDetails,
  SchemaVersionSummary
};
