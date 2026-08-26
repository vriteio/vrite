import { normalizeResourceName } from "@andesine/editor/normalize-resource-name";
import { normalizeSourceName } from "@andesine/editor/normalize-source-name";
import type { ContentNode } from "./document";

interface ContentFragment {
  name: string;
  content: ContentNode;
}
interface ContentProperty {
  name: string;
  type: PropertyType;
  value: PropertyValue;
}
interface ContentBlocks {
  fragments: Record<string, ContentFragment>;
  properties: Record<string, ContentProperty>;
}
type PropertyType = "text" | "number" | "checkbox" | "date" | "url" | "select" | "multi-select";
type PropertyValue = string | number | boolean | string[] | null;

const PROPERTY_TYPES: PropertyType[] = [
  "text",
  "number",
  "checkbox",
  "date",
  "url",
  "select",
  "multi-select"
];
const getUniqueBlockName = (record: Record<string, unknown>, name: string): string => {
  let uniqueName = name;
  let suffix = 1;

  while (Object.prototype.hasOwnProperty.call(record, uniqueName)) {
    suffix += 1;
    uniqueName = `${name}${suffix}`;
  }

  return uniqueName;
};
const normalizePropertyValue = (node: ContentNode): PropertyValue => {
  const type = node.attrs?.type;
  const value = node.attrs?.value;

  if (type === "checkbox") return value === true;

  if (type === "number") {
    const numberValue = Number(value);

    return value === "" || !Number.isFinite(numberValue) ? null : numberValue;
  }

  if (type === "multi-select") return Array.isArray(value) ? value : [];

  return typeof value === "string" ? value : "";
};
const normalizePropertyType = (type: unknown): PropertyType => {
  if (typeof type === "string" && PROPERTY_TYPES.includes(type as PropertyType)) {
    return type as PropertyType;
  }

  return "text";
};
const getContentBlocks = (content: ContentNode): ContentBlocks => {
  const fragments: ContentBlocks["fragments"] = {};
  const properties: ContentBlocks["properties"] = {};

  for (const node of content.content || []) {
    if (node.type === "fragment") {
      const sourceName = normalizeSourceName(node.attrs?.name, "Content");
      const normalizedName = normalizeResourceName(sourceName, "content");
      const name = getUniqueBlockName(fragments, normalizedName);

      fragments[name] = {
        name: sourceName,
        content: { type: "doc", content: node.content || [] }
      };
    }

    if (node.type === "property") {
      const sourceName = normalizeSourceName(node.attrs?.label, "Property");
      const type = normalizePropertyType(node.attrs?.type);
      const normalizedName = normalizeResourceName(sourceName, "property");
      const name = getUniqueBlockName(properties, normalizedName);

      properties[name] = {
        name: sourceName,
        type,
        value: normalizePropertyValue(node)
      };
    }
  }

  return { fragments, properties };
};
const getContentTitle = (content: ContentNode): string => {
  const getText = (node: ContentNode): string => {
    return `${node.text || ""}${(node.content || []).map(getText).join("")}`;
  };
  const title = content.content?.find(({ type }) => type === "title");

  return title ? getText(title).trim() || "Untitled" : "Untitled";
};

export { getContentBlocks, getContentTitle };
export type { ContentBlocks, ContentFragment, ContentProperty, PropertyType, PropertyValue };
