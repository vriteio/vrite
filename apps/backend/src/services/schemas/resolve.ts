import { collections, collectionSchemas } from "#backend/db";
import { type ServiceResolveContext } from "#backend/lib/policy";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNotNull, isNull } from "drizzle-orm";

interface CollectionSchemaInput {
  collectionID: string;
}

const resolveSchemaCollection = async ({
  database,
  input,
  workspaceID
}: ServiceResolveContext<CollectionSchemaInput>) => {
  const [collection] = await database
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(
        eq(collections.id, toUUID(input.collectionID)),
        eq(collections.workspaceID, workspaceID),
        isNotNull(collections.parentID),
        isNull(collections.deletedAt)
      )
    );

  if (!collection) throw new ORPCError("NOT_FOUND", { message: "Collection not found" });

  return collection;
};
const resolveLocalCollectionSchema = async (
  context: ServiceResolveContext<CollectionSchemaInput>
) => {
  const collection = await resolveSchemaCollection(context);
  const [schema] = await context.database
    .select()
    .from(collectionSchemas)
    .where(
      and(
        eq(collectionSchemas.workspaceID, context.workspaceID),
        eq(collectionSchemas.collectionID, collection.id)
      )
    );

  return { collection, schema: schema || null };
};

export { resolveLocalCollectionSchema, resolveSchemaCollection };
export type { CollectionSchemaInput };
