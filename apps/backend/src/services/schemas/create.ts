import {
  collectionSchemas,
  schemaDraftContributors,
  schemaVersionContributors,
  schemaVersions
} from "#backend/db";
import {
  mapLocalCollectionSchema,
  mapSchemaVersionSummary,
  type LocalCollectionSchema
} from "#backend/lib/data";
import { replaceContentDocument } from "#backend/lib/content";
import { withAuthorization } from "#backend/lib/policy";
import { toUUID } from "#backend/lib/primitives";
import {
  createEmptySchemaDefinition,
  createSchemaEditorDocument,
  hashSchemaDefinition
} from "#backend/lib/schema";
import { and, eq } from "drizzle-orm";
import { Doc, encodeStateAsUpdate } from "yjs";
import { type CollectionSchemaInput, resolveLocalCollectionSchema } from "./resolve";

interface CreateCollectionSchemaResult {
  changed: boolean;
  schema: LocalCollectionSchema;
}

type ResolvedCreateCollectionSchema = Awaited<ReturnType<typeof resolveLocalCollectionSchema>>;

const createCollectionSchema = withAuthorization<
  CollectionSchemaInput,
  ResolvedCreateCollectionSchema,
  CreateCollectionSchemaResult
>(
  {
    actions: ({ input }) => ({
      collections: [{ action: "collection:update", collectionID: input.collectionID }]
    }),
    resolve: resolveLocalCollectionSchema,
    transaction: "locked-workspace"
  },
  async ({ auth, database, resolved, workspaceID }) => {
    const definition = createEmptySchemaDefinition();
    const document = new Doc();

    replaceContentDocument(document, createSchemaEditorDocument(definition));

    const draftState = Buffer.from(encodeStateAsUpdate(document));
    const draftHash = hashSchemaDefinition(definition);
    let schema = resolved.schema;
    let changed = false;

    if (!schema) {
      [schema] = await database
        .insert(collectionSchemas)
        .values({
          workspaceID,
          collectionID: resolved.collection.id,
          enabled: true,
          draftState,
          draftDocument: definition,
          draftHash
        })
        .returning();
      changed = true;
    } else if (!schema.enabled || !schema.draftDocument || !schema.draftState) {
      const hasDraft = Boolean(schema.draftDocument && schema.draftState);

      [schema] = await database
        .update(collectionSchemas)
        .set({
          enabled: true,
          ...(!hasDraft && {
            draftState,
            draftDocument: definition,
            draftHash
          }),
          updatedAt: new Date()
        })
        .where(
          and(eq(collectionSchemas.id, schema.id), eq(collectionSchemas.workspaceID, workspaceID))
        )
        .returning();
      changed = true;
    }

    if (auth.session?.memberID) {
      await database
        .insert(schemaDraftContributors)
        .values({
          workspaceID,
          schemaID: schema.id,
          membershipID: toUUID(auth.session.memberID)
        })
        .onConflictDoNothing();
    }

    const [activeVersion] = await database
      .select()
      .from(schemaVersions)
      .where(
        and(
          eq(schemaVersions.workspaceID, workspaceID),
          eq(schemaVersions.schemaID, schema.id),
          eq(schemaVersions.active, true)
        )
      );
    const contributors = activeVersion
      ? await database
          .select({ membershipID: schemaVersionContributors.membershipID })
          .from(schemaVersionContributors)
          .where(
            and(
              eq(schemaVersionContributors.workspaceID, workspaceID),
              eq(schemaVersionContributors.versionID, activeVersion.id)
            )
          )
      : [];
    const mappedActiveVersion = activeVersion
      ? mapSchemaVersionSummary(
          activeVersion,
          resolved.collection.id,
          contributors.map(({ membershipID }) => membershipID)
        )
      : null;

    return {
      changed,
      schema: mapLocalCollectionSchema({ row: schema, activeVersion: mappedActiveVersion })
    };
  }
);

export { createCollectionSchema };
export type { CreateCollectionSchemaResult };
