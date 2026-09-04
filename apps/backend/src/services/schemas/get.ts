import { effectiveSchemaRevisions, schemaVersionContributors, schemaVersions } from "#backend/db";
import {
  mapEffectiveCollectionSchema,
  mapLocalCollectionSchema,
  mapSchemaVersionSummary,
  type CollectionSchemaDetails
} from "#backend/lib/data";
import { withAuthorization } from "#backend/lib/policy";
import { and, eq } from "drizzle-orm";
import { type CollectionSchemaInput, resolveLocalCollectionSchema } from "./resolve";

type ResolvedCollectionSchema = Awaited<ReturnType<typeof resolveLocalCollectionSchema>>;

const getCollectionSchema = withAuthorization<
  CollectionSchemaInput,
  ResolvedCollectionSchema,
  CollectionSchemaDetails
>(
  {
    actions: ({ input }) => ({
      collections: [{ action: "collection:read", collectionID: input.collectionID }]
    }),
    resolve: resolveLocalCollectionSchema
  },
  async ({ database, resolved, workspaceID }) => {
    const [effectiveRevision] = await database
      .select()
      .from(effectiveSchemaRevisions)
      .where(
        and(
          eq(effectiveSchemaRevisions.workspaceID, workspaceID),
          eq(effectiveSchemaRevisions.collectionID, resolved.collection.id),
          eq(effectiveSchemaRevisions.active, true)
        )
      );
    const [activeVersion] = resolved.schema
      ? await database
          .select()
          .from(schemaVersions)
          .where(
            and(
              eq(schemaVersions.workspaceID, workspaceID),
              eq(schemaVersions.schemaID, resolved.schema.id),
              eq(schemaVersions.active, true)
            )
          )
      : [];
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
      local: resolved.schema
        ? mapLocalCollectionSchema({ row: resolved.schema, activeVersion: mappedActiveVersion })
        : null,
      effective: effectiveRevision
        ? mapEffectiveCollectionSchema(effectiveRevision, !activeVersion)
        : null
    };
  }
);

export { getCollectionSchema };
