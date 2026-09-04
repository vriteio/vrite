import { contentNodeType, type ContentNode, type PropertyType } from "#backend/lib/content";
import * as z from "zod";

interface SchemaProperty {
  id: string;
  kind: "property";
  label: string;
  type: PropertyType;
  defaultValue: SchemaPropertyValue;
  options: string[];
}
interface SchemaFragment {
  id: string;
  kind: "fragment";
  label: string;
  allowedBlocks: SchemaBlockType[];
  defaultContent: ContentNode[];
}
interface SchemaDefinition {
  formatVersion: 1;
  fields: Array<SchemaField>;
}

type SchemaBlockType = (typeof SCHEMA_BLOCK_TYPES)[number];
type SchemaField = SchemaFragment | SchemaProperty;
type SchemaPropertyValue = boolean | string | string[];

const MAX_SCHEMA_FIELD_LABEL_LENGTH = 50;
const SCHEMA_FIELD_ID_ATTRIBUTE = "schemaFieldID";
const SCHEMA_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "taskList",
  "horizontalRule"
] as const;
const schemaBlockType = z.enum(SCHEMA_BLOCK_TYPES);
const schemaPropertyValueType = z.union([z.boolean(), z.string(), z.array(z.string())]);
const schemaPropertyType: z.ZodType<SchemaProperty> = z
  .object({
    id: z.string().min(1),
    kind: z.literal("property"),
    label: z.string().max(MAX_SCHEMA_FIELD_LABEL_LENGTH),
    type: z.enum(["text", "number", "checkbox", "date", "url", "select", "multi-select"]),
    defaultValue: schemaPropertyValueType,
    options: z.array(z.string())
  })
  .superRefine((property, context) => {
    const value = property.defaultValue;

    if (property.type === "checkbox" && typeof value !== "boolean") {
      context.addIssue({
        code: "custom",
        message: "Checkbox defaults must be boolean values",
        path: ["defaultValue"]
      });
    }

    if (property.type === "multi-select" && !Array.isArray(value)) {
      context.addIssue({
        code: "custom",
        message: "Multi-select defaults must be string arrays",
        path: ["defaultValue"]
      });
    }

    if (
      property.type !== "checkbox" &&
      property.type !== "multi-select" &&
      typeof value !== "string"
    ) {
      context.addIssue({
        code: "custom",
        message: `${property.type} defaults must be string values`,
        path: ["defaultValue"]
      });
    }

    if (property.type === "select" && value && !property.options.includes(String(value))) {
      context.addIssue({
        code: "custom",
        message: "Select defaults must match an available option",
        path: ["defaultValue"]
      });
    }

    if (
      property.type === "multi-select" &&
      Array.isArray(value) &&
      value.some((item) => !property.options.includes(item))
    ) {
      context.addIssue({
        code: "custom",
        message: "Multi-select defaults must match available options",
        path: ["defaultValue"]
      });
    }
  });
const schemaFragmentType: z.ZodType<SchemaFragment> = z
  .object({
    id: z.string().min(1),
    kind: z.literal("fragment"),
    label: z.string().max(MAX_SCHEMA_FIELD_LABEL_LENGTH),
    allowedBlocks: z.array(schemaBlockType).min(1),
    defaultContent: z.array(contentNodeType).min(1)
  })
  .superRefine((fragment, context) => {
    const allowedBlocks = new Set(fragment.allowedBlocks);

    fragment.defaultContent.forEach((node, index) => {
      if (!allowedBlocks.has(node.type as SchemaBlockType)) {
        context.addIssue({
          code: "custom",
          message: `Default content uses unsupported block type "${node.type}"`,
          path: ["defaultContent", index]
        });
      }
    });
  });
const schemaFieldType: z.ZodType<SchemaField> = z.union([schemaPropertyType, schemaFragmentType]);
const schemaDraftDefinitionType: z.ZodType<SchemaDefinition> = z
  .object({
    formatVersion: z.literal(1),
    fields: z.array(schemaFieldType)
  })
  .superRefine((definition, context) => {
    const fieldIDs = new Set<string>();

    definition.fields.forEach((field, index) => {
      if (fieldIDs.has(field.id)) {
        context.addIssue({
          code: "custom",
          message: `Schema field ID "${field.id}" is duplicated`,
          path: ["fields", index, "id"]
        });
      }

      fieldIDs.add(field.id);
    });
  });
const schemaDefinitionType: z.ZodType<SchemaDefinition> = schemaDraftDefinitionType.refine(
  (definition) => definition.fields.length > 0,
  {
    message: "Schemas must contain at least one property or fragment",
    path: ["fields"]
  }
);

const createEmptySchemaDefinition = (): SchemaDefinition => ({ formatVersion: 1, fields: [] });

export {
  MAX_SCHEMA_FIELD_LABEL_LENGTH,
  SCHEMA_BLOCK_TYPES,
  SCHEMA_FIELD_ID_ATTRIBUTE,
  createEmptySchemaDefinition,
  schemaBlockType,
  schemaDefinitionType,
  schemaDraftDefinitionType,
  schemaFieldType,
  schemaFragmentType,
  schemaPropertyType
};
export type {
  SchemaBlockType,
  SchemaDefinition,
  SchemaField,
  SchemaFragment,
  SchemaProperty,
  SchemaPropertyValue
};
