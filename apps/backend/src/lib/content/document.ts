import { createHash } from "node:crypto";
import { type Doc, XmlElement, XmlText } from "yjs";

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
interface TextDelta {
  insert: unknown;
  attributes?: Record<string, unknown>;
}

const HASHED_MARK_NAME_PATTERN = /(.*)(--[a-zA-Z0-9+/=]{8})$/;
const normalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeValue);

  if (typeof value !== "object" || value === null) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
      .map(([key, item]) => [key, normalizeValue(item)])
  );
};
const serializeText = (text: XmlText): ContentNode[] => {
  return (text.toDelta() as TextDelta[]).flatMap((part) => {
    if (typeof part.insert !== "string" || part.insert.length === 0) return [];

    const node: ContentNode = { type: "text", text: part.insert };

    if (part.attributes) {
      node.marks = Object.entries(part.attributes)
        .map(([attributeName, attrs]) => ({
          type: HASHED_MARK_NAME_PATTERN.exec(attributeName)?.[1] || attributeName,
          ...(typeof attrs === "object" && attrs !== null && Object.keys(attrs).length > 0
            ? { attrs: normalizeValue(attrs) as Record<string, unknown> }
            : {})
        }))
        .sort((firstMark, secondMark) => {
          return JSON.stringify(firstMark).localeCompare(JSON.stringify(secondMark));
        });
    }

    return [node];
  });
};
const serializeNode = (item: unknown): ContentNode[] => {
  if (item instanceof XmlText) return serializeText(item);

  if (!(item instanceof XmlElement)) return [];

  const attrs = normalizeValue(item.getAttributes()) as Record<string, unknown>;
  const content = item.toArray().flatMap(serializeNode);
  const node: ContentNode = { type: item.nodeName };

  if (Object.keys(attrs).length > 0) node.attrs = attrs;

  if (content.length > 0) node.content = content;

  return [node];
};
const serializeContentDocument = (document: Doc): ContentNode => {
  const content = document.getXmlFragment("default").toArray().flatMap(serializeNode);

  return { type: "doc", content };
};
const hashContentDocument = (document: ContentNode): string => {
  const normalizedDocument = normalizeValue(document);

  return createHash("sha256").update(JSON.stringify(normalizedDocument)).digest("hex");
};

export { hashContentDocument, serializeContentDocument };
export type { ContentMark, ContentNode };
