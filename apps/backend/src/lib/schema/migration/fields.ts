import type { ContentNode, PropertyType } from "#backend/lib/content";
import { normalizeResourceName } from "@andesine/editor/normalize-resource-name";
import { SCHEMA_FIELD_ID_ATTRIBUTE, type SchemaField } from "../contract";

interface ExistingSchemaField {
  apiName: string;
  boundFieldID?: string;
  index: number;
  kind: SchemaField["kind"];
  node: ContentNode;
}

const PROPERTY_TYPES: PropertyType[] = [
  "text",
  "number",
  "checkbox",
  "date",
  "url",
  "select",
  "multi-select"
];
const getUniqueName = (usedNames: Set<string>, baseName: string): string => {
  let name = baseName;
  let suffix = 1;

  while (usedNames.has(name)) {
    suffix += 1;
    name = `${baseName}${suffix}`;
  }

  return name;
};
const getPropertyType = (value: unknown): PropertyType => {
  if (typeof value === "string" && PROPERTY_TYPES.includes(value as PropertyType)) {
    return value as PropertyType;
  }

  return "text";
};
const getBoundFieldID = (node: ContentNode): string | undefined => {
  const fieldID = node.attrs?.[SCHEMA_FIELD_ID_ATTRIBUTE];

  return typeof fieldID === "string" && fieldID ? fieldID : undefined;
};
const getExistingSchemaFields = (document: ContentNode): ExistingSchemaField[] => {
  const usedNames: Record<SchemaField["kind"], Set<string>> = {
    fragment: new Set(),
    property: new Set()
  };
  const fields: ExistingSchemaField[] = [];

  (document.content || []).forEach((node, index) => {
    const kind = node.type;

    if (kind !== "fragment" && kind !== "property") return;

    const fallback = kind === "fragment" ? "content" : "property";
    const label = kind === "fragment" ? node.attrs?.name : node.attrs?.label;
    const baseName = normalizeResourceName(String(label || ""), fallback);
    const apiName = getUniqueName(usedNames[kind], baseName);

    usedNames[kind].add(apiName);
    fields.push({
      apiName,
      boundFieldID: getBoundFieldID(node),
      index,
      kind,
      node
    });
  });

  return fields;
};
const matchSchemaFields = (
  schemaFields: Array<SchemaField>,
  existingFields: ExistingSchemaField[]
): Map<string, ExistingSchemaField> => {
  const usedNames: Record<SchemaField["kind"], Set<string>> = {
    fragment: new Set(),
    property: new Set()
  };
  const apiNames = new Map(
    schemaFields.map((field) => {
      const fallback = field.kind === "fragment" ? "content" : "property";
      const baseName = normalizeResourceName(field.label, fallback);
      const name = getUniqueName(usedNames[field.kind], baseName);

      usedNames[field.kind].add(name);
      return [field.id, name];
    })
  );
  const matches = new Map<string, ExistingSchemaField>();
  const matchedIndexes = new Set<number>();

  for (const schemaField of schemaFields) {
    const existingField = existingFields.find((field) => {
      return (
        !matchedIndexes.has(field.index) &&
        field.kind === schemaField.kind &&
        field.boundFieldID === schemaField.id
      );
    });

    if (!existingField) continue;

    matches.set(schemaField.id, existingField);
    matchedIndexes.add(existingField.index);
  }

  for (const schemaField of schemaFields) {
    if (matches.has(schemaField.id)) continue;

    const apiName = apiNames.get(schemaField.id);
    const existingField = existingFields.find((field) => {
      return (
        !matchedIndexes.has(field.index) &&
        !field.boundFieldID &&
        field.kind === schemaField.kind &&
        field.apiName === apiName
      );
    });

    if (!existingField) continue;

    matches.set(schemaField.id, existingField);
    matchedIndexes.add(existingField.index);
  }

  return matches;
};
const cloneContentNodes = (nodes: ContentNode[]): ContentNode[] => {
  return nodes.map((node) => {
    const attrs = Object.fromEntries(
      Object.entries(node.attrs || {}).filter(([name]) => name !== "id")
    );
    const content = node.content ? cloneContentNodes(node.content) : undefined;

    return {
      ...node,
      ...(Object.keys(attrs).length > 0 ? { attrs } : { attrs: undefined }),
      ...(content ? { content } : {})
    };
  });
};
const createEmptyContentNodes = (nodes: ContentNode[]): ContentNode[] => {
  return cloneContentNodes(nodes).flatMap((node) => {
    if (node.type === "text" || node.type === "hardBreak") return [];

    const content = node.content ? createEmptyContentNodes(node.content) : undefined;
    const attrs = node.type === "taskItem" ? { ...node.attrs, checked: false } : node.attrs;

    return [
      {
        ...node,
        ...(attrs ? { attrs } : {}),
        ...(content && content.length > 0 ? { content } : { content: undefined }),
        marks: undefined,
        text: undefined
      }
    ];
  });
};
const hasMeaningfulContent = (nodes: ContentNode[]): boolean => {
  return nodes.some((node) => {
    if (node.type === "text") return Boolean(node.text);
    if (node.type === "horizontalRule" || node.type === "hardBreak") return true;
    if (node.type === "taskItem" && node.attrs?.checked === true) return true;

    return hasMeaningfulContent(node.content || []);
  });
};

export {
  cloneContentNodes,
  createEmptyContentNodes,
  getExistingSchemaFields,
  getPropertyType,
  hasMeaningfulContent,
  matchSchemaFields
};
export type { ExistingSchemaField };
