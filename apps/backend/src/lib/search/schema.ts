interface TypesenseEmbeddingSchema {
  dimensions: number;
}

interface TypesenseFieldSchema {
  name: string;
  type: string;
  facet?: boolean;
  index?: boolean;
  num_dim?: number;
  optional?: boolean;
  sort?: boolean;
}

interface TypesenseCollectionSchema {
  name: string;
  fields: TypesenseFieldSchema[];
  default_sorting_field: string;
  enable_nested_fields: boolean;
}

interface SearchCollectionDefinition {
  alias: string;
  schema: TypesenseCollectionSchema;
}

const CURRENT_SEARCH_COLLECTION_ALIAS = "andesine_search_current";
const CURRENT_SEARCH_COLLECTION_NAME = "andesine_search_current_v1";
const PUBLISHED_SEARCH_COLLECTION_ALIAS = "andesine_search_published";
const PUBLISHED_SEARCH_COLLECTION_NAME = "andesine_search_published_v1";
const commonFields: TypesenseFieldSchema[] = [
  { name: "scope", type: "string" },
  { name: "workspaceID", type: "string" },
  { name: "entryID", type: "string", facet: true },
  { name: "collectionID", type: "string" },
  { name: "ancestorCollectionIDs", type: "string[]" },
  { name: "restrictedBoundaryIDs", type: "string[]" },
  { name: "collectionPath", type: "string[]" },
  { name: "title", type: "string" },
  { name: "heading", type: "string" },
  { name: "headingPath", type: "string[]" },
  { name: "content", type: "string" },
  { name: "propertyText", type: "string[]" },
  { name: "propertyValues", type: "object[]", index: false },
  { name: "propertyFilterPresence", type: "string[]" },
  { name: "propertyFilterBoolean_.*", type: "bool", optional: true },
  { name: "propertyFilterDate_.*", type: "int64", optional: true },
  { name: "propertyFilterNumber_.*", type: "float", optional: true },
  { name: "propertyFilterText_.*", type: "string[]", optional: true },
  { name: "chunkIndex", type: "int32" },
  { name: "chunkCount", type: "int32" },
  { name: "sectionIndex", type: "int32" },
  { name: "sectionChunkIndex", type: "int32" },
  { name: "updatedAt", type: "int64", sort: true }
];
const createSearchCollectionDefinitions = (
  embedding: TypesenseEmbeddingSchema
): SearchCollectionDefinition[] => {
  const embeddingField: TypesenseFieldSchema = {
    name: "embedding",
    type: "float[]",
    num_dim: embedding.dimensions
  };
  const currentSchema: TypesenseCollectionSchema = {
    name: CURRENT_SEARCH_COLLECTION_NAME,
    fields: [...commonFields, embeddingField],
    default_sorting_field: "updatedAt",
    enable_nested_fields: true
  };
  const publishedSchema: TypesenseCollectionSchema = {
    name: PUBLISHED_SEARCH_COLLECTION_NAME,
    fields: [
      ...commonFields,
      { name: "channelID", type: "string" },
      { name: "channelCode", type: "string" },
      { name: "versionID", type: "string" },
      embeddingField
    ],
    default_sorting_field: "updatedAt",
    enable_nested_fields: true
  };

  return [
    { alias: CURRENT_SEARCH_COLLECTION_ALIAS, schema: currentSchema },
    { alias: PUBLISHED_SEARCH_COLLECTION_ALIAS, schema: publishedSchema }
  ];
};

export {
  CURRENT_SEARCH_COLLECTION_ALIAS,
  CURRENT_SEARCH_COLLECTION_NAME,
  PUBLISHED_SEARCH_COLLECTION_ALIAS,
  PUBLISHED_SEARCH_COLLECTION_NAME,
  createSearchCollectionDefinitions
};
export type { SearchCollectionDefinition, TypesenseCollectionSchema, TypesenseFieldSchema };
