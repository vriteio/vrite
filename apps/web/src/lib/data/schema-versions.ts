import { createAsync, query } from "@solidjs/router";
import { client } from "#web/lib/api";

interface SchemaVersionHistoryQueryInput {
  schemaID: string;
  cursor?: string;
  limit?: number;
}
interface SchemaVersionDetailsQueryInput {
  id: string;
}
interface SchemaDraftQueryInput {
  collectionID: string;
}
interface SchemaVersionQueryResult<T> {
  result?: T;
  error?: true;
}

type SchemaVersionListPage = Awaited<ReturnType<typeof client.schemaVersions.list>>;
type SchemaVersionSummary = SchemaVersionListPage["data"][number];

const getQueryResult = async <T>(
  request: () => Promise<T>
): Promise<SchemaVersionQueryResult<T>> => {
  try {
    return { result: await request() };
  } catch (error) {
    console.error(error);

    return { error: true };
  }
};
const schemaVersionHistoryQuery = query((input: SchemaVersionHistoryQueryInput) => {
  return getQueryResult(() => client.schemaVersions.list(input));
}, "schema-version-history");
const schemaVersionDetailsQuery = query((input: SchemaVersionDetailsQueryInput) => {
  return getQueryResult(() => client.schemaVersions.get(input));
}, "schema-version-details");
const schemaDraftQuery = query((input: SchemaDraftQueryInput) => {
  return getQueryResult(() => client.schemas.get(input));
}, "schema-draft");
const createKeyedResponse = <T>(
  key: () => string,
  request: (id: string) => Promise<SchemaVersionQueryResult<T>>
) => {
  const resource = createAsync(async () => {
    const id = key();

    if (!id) return null;

    return { id, response: await request(id) };
  });

  return () => {
    const latest = resource.latest;

    if (latest?.id === key()) return latest.response;

    return resource()?.response;
  };
};
const createSchemaVersionDetailsResponse = (versionID: () => string) => {
  return createKeyedResponse(versionID, (id) => schemaVersionDetailsQuery({ id }));
};
const createSchemaDraftResponse = (collectionID: () => string) => {
  return createKeyedResponse(collectionID, (id) => schemaDraftQuery({ collectionID: id }));
};

export {
  createSchemaDraftResponse,
  createSchemaVersionDetailsResponse,
  schemaDraftQuery,
  schemaVersionDetailsQuery,
  schemaVersionHistoryQuery
};
export type {
  SchemaVersionHistoryQueryInput,
  SchemaVersionListPage,
  SchemaVersionQueryResult,
  SchemaVersionSummary
};
