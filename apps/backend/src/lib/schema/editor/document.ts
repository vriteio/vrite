import type { ContentNode } from "#backend/lib/content";
import {
  SCHEMA_BLOCK_TYPES,
  SCHEMA_FIELD_ID_ATTRIBUTE,
  type SchemaBlockType,
  type SchemaDefinition,
  type SchemaField,
  type SchemaFragment,
  type SchemaProperty
} from "../contract";
import type { ResolvedSchemaDefinition, ResolvedSchemaField } from "../inheritance";

const normalizeStringArray = (value: unknown): string[] => {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
};
const getSchemaFieldID = (node: ContentNode): string => {
  const schemaFieldID = node.attrs?.[SCHEMA_FIELD_ID_ATTRIBUTE];
  const nodeID = node.attrs?.id;

  if (typeof nodeID === "string" && nodeID) return nodeID;
  if (typeof schemaFieldID === "string" && schemaFieldID) return schemaFieldID;

  return crypto.randomUUID();
};
const createPropertyDefinition = (node: ContentNode): SchemaProperty => {
  const parsedType = node.attrs?.type;
  const type = ["text", "number", "checkbox", "date", "url", "select", "multi-select"].includes(
    String(parsedType)
  )
    ? (parsedType as SchemaProperty["type"])
    : "text";
  const options = normalizeStringArray(node.attrs?.options);
  const rawValue = node.attrs?.value;
  let defaultValue: boolean | string | string[] = "";

  if (type === "checkbox") {
    defaultValue = rawValue === true;
  } else if (type === "multi-select") {
    defaultValue = normalizeStringArray(rawValue).filter((value) => options.includes(value));
  } else if (typeof rawValue === "string") {
    defaultValue = type === "select" && !options.includes(rawValue) ? "" : rawValue;
  }

  return {
    id: getSchemaFieldID(node),
    kind: "property",
    label: typeof node.attrs?.label === "string" ? node.attrs.label : "",
    type,
    defaultValue,
    options
  };
};
const createFragmentDefinition = (node: ContentNode): SchemaFragment => {
  const configuredBlocks = normalizeStringArray(node.attrs?.allowedBlocks).filter((block) => {
    return SCHEMA_BLOCK_TYPES.includes(block as SchemaBlockType);
  }) as SchemaBlockType[];
  const allowedBlocks = configuredBlocks.length > 0 ? configuredBlocks : [...SCHEMA_BLOCK_TYPES];
  const defaultContent = (node.content || []).filter((block) => {
    return allowedBlocks.includes(block.type as SchemaBlockType);
  });

  return {
    id: getSchemaFieldID(node),
    kind: "fragment",
    label: typeof node.attrs?.name === "string" ? node.attrs.name : "",
    allowedBlocks,
    defaultContent:
      defaultContent.length > 0
        ? defaultContent
        : [{ type: allowedBlocks.includes("paragraph") ? "paragraph" : allowedBlocks[0] }]
  };
};

const createSchemaEditorFieldNode = (
  field: SchemaField | ResolvedSchemaField,
  inherited = false
): ContentNode => {
  const source = "source" in field ? field.source : undefined;
  const sharedAttributes = {
    id: field.id,
    [SCHEMA_FIELD_ID_ATTRIBUTE]: field.id,
    inherited: inherited || source?.inherited || false,
    sourceCollectionID: source?.collectionID
  };

  if (field.kind === "property") {
    return {
      type: "property",
      attrs: {
        ...sharedAttributes,
        label: field.label,
        type: field.type,
        value: field.defaultValue,
        options: field.options
      }
    };
  }

  return {
    type: "fragment",
    attrs: {
      ...sharedAttributes,
      name: field.label,
      allowedBlocks: field.allowedBlocks
    },
    content: field.defaultContent
  };
};
const createSchemaEditorDocument = (
  definition: SchemaDefinition | ResolvedSchemaDefinition,
  inheritedDefinition?: ResolvedSchemaDefinition | null
): ContentNode => ({
  type: "doc",
  content: [
    ...(inheritedDefinition?.fields.map((field) => createSchemaEditorFieldNode(field, true)) || []),
    ...definition.fields.map((field) => createSchemaEditorFieldNode(field)),
    { type: "paragraph" }
  ]
});
const createSchemaDefinitionFromEditorDocument = (document: ContentNode): SchemaDefinition => {
  const fields = (document.content || []).flatMap((node): SchemaField[] => {
    if (node.attrs?.inherited) return [];
    if (node.type === "property") return [createPropertyDefinition(node)];
    if (node.type === "fragment") return [createFragmentDefinition(node)];

    return [];
  });
  const usedFieldIDs = new Set<string>();

  for (const field of fields) {
    if (usedFieldIDs.has(field.id)) field.id = crypto.randomUUID();

    usedFieldIDs.add(field.id);
  }

  return { formatVersion: 1, fields };
};

export { createSchemaDefinitionFromEditorDocument, createSchemaEditorDocument };
