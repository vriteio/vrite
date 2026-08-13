import { contents, entries, type Entry } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { applyUpdate, Doc, XmlElement, XmlText } from "yjs";

interface ContentMark {
  type: string;
  attrs?: Record<string, unknown>;
}
interface ContentNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ContentNode[];
  marks?: ContentMark[];
  text?: string;
}
type PropertyType =
  "text" | "long-text" | "number" | "checkbox" | "date" | "url" | "select" | "multi-select";

interface EntryDetails extends Entry {
  updatedAt: string;
  content: ContentNode;
  fragments: Record<string, { name: string; content: ContentNode }>;
  properties: Record<
    string,
    {
      name: string;
      type: PropertyType;
      value: string | number | boolean | string[] | null;
    }
  >;
}
interface TextDelta {
  insert: unknown;
  attributes?: Record<string, unknown>;
}

const HASHED_MARK_NAME_PATTERN = /(.*)(--[a-zA-Z0-9+/=]{8})$/;
const PROPERTY_TYPES: PropertyType[] = [
  "text",
  "long-text",
  "number",
  "checkbox",
  "date",
  "url",
  "select",
  "multi-select"
];
const normalizeBlockName = (name: string, fallback: string): string => {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return normalizedName || fallback;
};
const getUniqueBlockName = (record: Record<string, unknown>, name: string): string => {
  let uniqueName = name;
  let suffix = 1;

  while (uniqueName in record) {
    suffix += 1;
    uniqueName = `${name}-${suffix}`;
  }

  return uniqueName;
};
const normalizePropertyValue = (node: ContentNode): string | number | boolean | string[] | null => {
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
const serializeText = (text: XmlText): ContentNode[] => {
  return (text.toDelta() as TextDelta[]).flatMap((part) => {
    if (typeof part.insert !== "string" || part.insert.length === 0) return [];

    const node: ContentNode = { type: "text", text: part.insert };

    if (part.attributes) {
      node.marks = Object.entries(part.attributes).map(([attributeName, attrs]) => ({
        type: HASHED_MARK_NAME_PATTERN.exec(attributeName)?.[1] || attributeName,
        ...(typeof attrs === "object" && attrs !== null && Object.keys(attrs).length > 0
          ? { attrs: attrs as Record<string, unknown> }
          : {})
      }));
    }

    return [node];
  });
};
const serializeNode = (item: unknown): ContentNode[] => {
  if (item instanceof XmlText) return serializeText(item);

  if (!(item instanceof XmlElement)) return [];

  const attrs = item.getAttributes() as Record<string, unknown>;
  const content = item.toArray().flatMap(serializeNode);
  const node: ContentNode = { type: item.nodeName };

  if (Object.keys(attrs).length > 0) node.attrs = attrs;

  if (content.length > 0) node.content = content;

  return [node];
};
const getEntry = async (input: { id: string; workspaceID: string }): Promise<EntryDetails> => {
  const [row] = await db
    .select({
      id: entries.id,
      name: entries.name,
      rank: entries.rank,
      collectionID: entries.collectionID,
      contentState: contents.state,
      contentUpdatedAt: contents.updatedAt
    })
    .from(entries)
    .innerJoin(contents, eq(contents.entryID, entries.id))
    .where(
      and(
        eq(entries.id, toUUID(input.id)),
        eq(entries.workspaceID, toUUID(input.workspaceID)),
        isNull(entries.deletedAt)
      )
    )
    .limit(1);

  if (!row) throw new ORPCError("NOT_FOUND");

  const document = new Doc();

  if (row.contentState) {
    applyUpdate(document, new Uint8Array(row.contentState));
  }

  const nodes = document.getXmlFragment("default").toArray().flatMap(serializeNode);
  const content: ContentNode = { type: "doc", content: nodes };
  const fragments: Record<string, { name: string; content: ContentNode }> = {};
  const properties: EntryDetails["properties"] = {};

  for (const node of content.content || []) {
    if (node.type === "fragment") {
      const sourceName = String(node.attrs?.name || "").trim() || "Content";
      const normalizedName = normalizeBlockName(sourceName, "content");
      const name = getUniqueBlockName(fragments, normalizedName);

      fragments[name] = {
        name: sourceName,
        content: { type: "doc", content: node.content || [] }
      };
    }

    if (node.type === "property") {
      const sourceName = String(node.attrs?.label || "").trim() || "Property";
      const type = normalizePropertyType(node.attrs?.type);
      const normalizedName = normalizeBlockName(sourceName, "property");
      const name = getUniqueBlockName(properties, normalizedName);

      properties[name] = {
        name: sourceName,
        type,
        value: normalizePropertyValue(node)
      };
    }
  }

  return {
    id: toEntryID(row.id),
    name: row.name,
    order: row.rank,
    collectionID: row.collectionID ? toCollectionID(row.collectionID) : undefined,
    updatedAt: row.contentUpdatedAt.toISOString(),
    content,
    fragments,
    properties
  };
};

export { getEntry };
export type { ContentNode, EntryDetails, PropertyType };
