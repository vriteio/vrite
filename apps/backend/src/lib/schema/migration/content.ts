import { hashContentDocument, type ContentNode } from "#backend/lib/content";
import {
  SCHEMA_BLOCK_TYPES,
  SCHEMA_FIELD_ID_ATTRIBUTE,
  schemaDefinitionType,
  type SchemaDefinition,
  type SchemaFragment,
  type SchemaProperty
} from "../contract";
import {
  cloneContentNodes,
  createEmptyContentNodes,
  getExistingSchemaFields,
  getPropertyType,
  hasMeaningfulContent,
  matchSchemaFields,
  type ExistingSchemaField
} from "./fields";
import { getEmptyPropertyValue, isPropertyValueEmpty, migratePropertyValue } from "./property";

interface SchemaContentMigrationInput {
  defaultMode?: SchemaContentDefaultMode;
  document: ContentNode;
  schema: SchemaDefinition;
}
interface SchemaContentMigrationResult {
  changed: boolean;
  contentLost: boolean;
  document: ContentNode;
}

type SchemaContentDefaultMode = "migration" | "new-entry" | "none";

const createPropertyNode = (
  property: SchemaProperty,
  defaultMode: SchemaContentDefaultMode,
  existing?: ExistingSchemaField
): { contentLost: boolean; node: ContentNode } => {
  const sourceType = getPropertyType(existing?.node.attrs?.type);
  const sourceValue = existing?.node.attrs?.value;
  const migration = existing
    ? migratePropertyValue(property, sourceType, sourceValue, {
        useDefault: defaultMode === "migration"
      })
    : {
        contentLost: false,
        value: defaultMode === "none" ? getEmptyPropertyValue(property) : property.defaultValue
      };

  return {
    contentLost: migration.contentLost,
    node: {
      type: "property",
      attrs: {
        // Keep attributes that are not owned by schema enforcement.
        ...existing?.node.attrs,
        [SCHEMA_FIELD_ID_ATTRIBUTE]: property.id,
        label: property.label,
        options: [...property.options],
        type: property.type,
        value: Array.isArray(migration.value) ? [...migration.value] : migration.value
      }
    }
  };
};
const createFragmentNode = (
  fragment: SchemaFragment,
  content: ContentNode[],
  defaultMode: SchemaContentDefaultMode,
  existing?: ExistingSchemaField
): ContentNode => {
  const fragmentContent = hasMeaningfulContent(content)
    ? content
    : defaultMode === "none"
      ? content.length > 0
        ? content
        : createEmptyContentNodes(fragment.defaultContent)
      : cloneContentNodes(fragment.defaultContent);

  return {
    type: "fragment",
    attrs: {
      // Keep attributes that are not owned by schema enforcement.
      ...existing?.node.attrs,
      [SCHEMA_FIELD_ID_ATTRIBUTE]: fragment.id,
      allowedBlocks: [...fragment.allowedBlocks],
      name: fragment.label
    },
    content: fragmentContent
  };
};
const getFirstCompatibleFragment = (
  fragments: SchemaFragment[],
  node: ContentNode
): SchemaFragment | undefined => {
  return fragments.find((fragment) => {
    return fragment.allowedBlocks.includes(node.type as SchemaFragment["allowedBlocks"][number]);
  });
};
const migrateContentToSchema = (
  input: SchemaContentMigrationInput
): SchemaContentMigrationResult => {
  const defaultMode = input.defaultMode || "migration";
  const schema = schemaDefinitionType.parse(input.schema);
  const existingFields = getExistingSchemaFields(input.document);
  const matches = matchSchemaFields(schema.fields, existingFields);
  const properties = schema.fields.filter(
    (field): field is SchemaProperty => field.kind === "property"
  );
  const fragments = schema.fields.filter(
    (field): field is SchemaFragment => field.kind === "fragment"
  );
  const propertyNodes = new Map<string, ContentNode>();
  const fragmentContent = new Map<string, ContentNode[]>(
    fragments.map((fragment) => [fragment.id, []])
  );
  const matchedExistingIndexes = new Set(
    [...matches.values()].map((existingField) => existingField.index)
  );
  const titleIndex = (input.document.content || []).findIndex((node) => node.type === "title");
  const title =
    titleIndex >= 0
      ? input.document.content![titleIndex]
      : ({ type: "title" } satisfies ContentNode);

  let contentLost = false;

  for (const property of properties) {
    const existing = matches.get(property.id);
    const migrated = createPropertyNode(property, defaultMode, existing);

    contentLost ||= migrated.contentLost;
    propertyNodes.set(property.id, migrated.node);
  }

  for (const existing of existingFields) {
    if (existing.kind !== "property" || matchedExistingIndexes.has(existing.index)) continue;

    const type = getPropertyType(existing.node.attrs?.type);

    contentLost ||= !isPropertyValueEmpty(type, existing.node.attrs?.value);
  }

  (input.document.content || []).forEach((node, index) => {
    if (index === titleIndex || node.type === "property") return;
    if (node.type !== "fragment" && !hasMeaningfulContent([node])) return;

    const existing = existingFields.find((field) => field.index === index);
    const matchedFragment = existing
      ? fragments.find((fragment) => matches.get(fragment.id)?.index === existing.index)
      : undefined;
    const blocks = node.type === "fragment" ? node.content || [] : [node];

    for (const block of blocks) {
      const targetFragment =
        matchedFragment &&
        matchedFragment.allowedBlocks.includes(
          block.type as SchemaFragment["allowedBlocks"][number]
        )
          ? matchedFragment
          : getFirstCompatibleFragment(fragments, block);

      if (!targetFragment) {
        contentLost ||= hasMeaningfulContent([block]);
        continue;
      }

      fragmentContent.get(targetFragment.id)!.push(block);
    }
  });

  const migratedFields = schema.fields.map((field) => {
    if (field.kind === "property") return propertyNodes.get(field.id)!;

    return createFragmentNode(
      field,
      fragmentContent.get(field.id) || [],
      defaultMode,
      matches.get(field.id)
    );
  });
  const document: ContentNode = {
    ...input.document,
    type: "doc",
    content: [title, ...migratedFields]
  };

  return {
    changed: hashContentDocument(document) !== hashContentDocument(input.document),
    contentLost,
    document
  };
};

const removeContentSchema = (document: ContentNode): SchemaContentMigrationResult => {
  const content = document.content?.map((node) => {
    if (node.type !== "property" && node.type !== "fragment") return node;
    if (!node.attrs?.schemaFieldID && !node.attrs?.inherited && !node.attrs?.sourceCollectionID) {
      return node;
    }

    return {
      ...node,
      attrs: {
        ...node.attrs,
        schemaFieldID: null,
        inherited: false,
        sourceCollectionID: null,
        ...(node.type === "fragment" && { allowedBlocks: [...SCHEMA_BLOCK_TYPES] })
      }
    };
  });
  const unrestrictedDocument = { ...document, content };

  return {
    changed: hashContentDocument(unrestrictedDocument) !== hashContentDocument(document),
    contentLost: false,
    document: unrestrictedDocument
  };
};

export { migrateContentToSchema, removeContentSchema };
export type { SchemaContentDefaultMode, SchemaContentMigrationInput, SchemaContentMigrationResult };
