import { collections, collectionSchemas, schemaVersions } from "#backend/db";
import { type ServiceResolveContext } from "#backend/lib/policy";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNotNull, isNull } from "drizzle-orm";

interface SchemaVersionListInput {
  schemaID: string;
}
interface SchemaVersionInput {
  versionID: string;
}

const resolveSchemaVersionList = async ({
  database,
  input,
  workspaceID
}: ServiceResolveContext<SchemaVersionListInput>) => {
  const [row] = await database
    .select({ collectionID: collections.id, schema: collectionSchemas })
    .from(collectionSchemas)
    .innerJoin(
      collections,
      and(
        eq(collections.workspaceID, collectionSchemas.workspaceID),
        eq(collections.id, collectionSchemas.collectionID),
        isNotNull(collections.parentID),
        isNull(collections.deletedAt)
      )
    )
    .where(
      and(
        eq(collectionSchemas.id, toUUID(input.schemaID)),
        eq(collectionSchemas.workspaceID, workspaceID)
      )
    );

  if (!row) throw new ORPCError("NOT_FOUND", { message: "Schema not found" });

  return row;
};
const resolveSchemaVersion = async ({
  database,
  input,
  workspaceID
}: ServiceResolveContext<SchemaVersionInput>) => {
  const [row] = await database
    .select({ collectionID: collections.id, version: schemaVersions })
    .from(schemaVersions)
    .innerJoin(
      collectionSchemas,
      and(
        eq(collectionSchemas.workspaceID, schemaVersions.workspaceID),
        eq(collectionSchemas.id, schemaVersions.schemaID)
      )
    )
    .innerJoin(
      collections,
      and(
        eq(collections.workspaceID, collectionSchemas.workspaceID),
        eq(collections.id, collectionSchemas.collectionID),
        isNotNull(collections.parentID),
        isNull(collections.deletedAt)
      )
    )
    .where(
      and(
        eq(schemaVersions.id, toUUID(input.versionID)),
        eq(schemaVersions.workspaceID, workspaceID)
      )
    );

  if (!row) throw new ORPCError("NOT_FOUND", { message: "Schema version not found" });

  return row;
};

export { resolveSchemaVersion, resolveSchemaVersionList };
export type { SchemaVersionInput, SchemaVersionListInput };
