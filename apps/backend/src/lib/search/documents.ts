import { getContentBlocks, type ContentProperty } from "#backend/lib/content/blocks";
import type { ContentNode } from "#backend/lib/content/document";
import type {
  BuiltSearchDocument,
  CurrentSearchDocument,
  CurrentSearchDocumentSource,
  PublishedSearchDocument,
  PublishedSearchDocumentSource,
  SearchDocument,
  SearchDocumentSource,
  SearchPropertyValue
} from "./types";
import {
  getPropertyFilterField,
  getPropertyFilterPresenceValue,
  getTextPropertyFilterValue
} from "./query";

interface SearchContentBlock {
  headingLevel?: number;
  resetHeading?: boolean;
  text: string;
}
interface SearchContentSection {
  blocks: string[];
  headingPath: string[];
}
interface SearchContentChunk {
  content: string;
  headingPath: string[];
  sectionChunkIndex: number;
  sectionIndex: number;
}
interface SearchDocumentDetails {
  chunks: SearchContentChunk[];
  propertyFilterFields: Record<string, boolean | number | string[]>;
  propertyFilterPresence: string[];
  propertyText: string[];
  propertyValues: SearchPropertyValue[];
}
interface SearchPropertyFilterDetails {
  fields: Record<string, boolean | number | string[]>;
  presence: string[];
}
interface SearchHeading {
  level: number;
  text: string;
}

const SEARCH_CHUNK_MAX_CHARACTERS = 4000;
const SEARCH_CHUNK_OVERLAP_CHARACTERS = 400;
const BLOCK_NODE_TYPES = new Set([
  "blockquote",
  "bulletList",
  "codeBlock",
  "doc",
  "fragment",
  "hardBreak",
  "heading",
  "horizontalRule",
  "listItem",
  "orderedList",
  "paragraph",
  "taskItem",
  "taskList"
]);

const normalizeText = (value: string): string => {
  return value
    .replace(/[\t\r ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
const getNodeText = (node: ContentNode): string => {
  if (node.type === "property" || node.type === "title") return "";

  const content = `${node.text || ""}${(node.content || []).map(getNodeText).join("")}`;

  return BLOCK_NODE_TYPES.has(node.type) ? `${content}\n` : content;
};
const getHeadingLevel = (node: ContentNode): number => {
  const level = node.attrs?.level;

  return typeof level === "number" && Number.isInteger(level) && level >= 1 && level <= 6
    ? level
    : 1;
};
const getSearchContentBlocks = (node: ContentNode): SearchContentBlock[] => {
  if (node.type === "property" || node.type === "title") return [];

  if (node.type === "heading") {
    const text = normalizeText(getNodeText(node));

    return text ? [{ headingLevel: getHeadingLevel(node), text }] : [];
  }

  if (node.type === "fragment") {
    return [
      { resetHeading: true, text: "" },
      ...(node.content || []).flatMap(getSearchContentBlocks),
      { resetHeading: true, text: "" }
    ];
  }

  if (node.type === "doc") {
    return (node.content || []).flatMap(getSearchContentBlocks);
  }

  const text = normalizeText(getNodeText(node));

  return text ? [{ text }] : [];
};
const getDateValue = (value: string): number | undefined => {
  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? undefined : Math.floor(timestamp / 1000);
};
const getPropertyValue = (key: string, property: ContentProperty): SearchPropertyValue => {
  const searchProperty: SearchPropertyValue = {
    key,
    name: property.name,
    type: property.type
  };

  if (property.type === "number" && typeof property.value === "number") {
    searchProperty.numberValue = property.value;
  } else if (property.type === "checkbox" && typeof property.value === "boolean") {
    searchProperty.booleanValue = property.value;
  } else if (property.type === "date" && typeof property.value === "string") {
    searchProperty.dateValue = getDateValue(property.value);
  } else if (Array.isArray(property.value)) {
    searchProperty.textValue = property.value;
  } else if (typeof property.value === "string") {
    searchProperty.textValue = [property.value];
  }

  return searchProperty;
};
const formatPropertyText = (property: ContentProperty): string => {
  const value = Array.isArray(property.value) ? property.value.join(", ") : property.value;

  return value === null || value === "" ? property.name : `${property.name}: ${String(value)}`;
};
const getPropertyFilterFields = (
  properties: Array<[string, ContentProperty]>
): SearchPropertyFilterDetails => {
  const fields: Record<string, boolean | number | string[]> = {};
  const presence: string[] = [];
  const setField = (
    kind: "boolean" | "date" | "number" | "text",
    key: string,
    value: boolean | number | string[]
  ) => {
    fields[getPropertyFilterField(kind, key)] = value;
    presence.push(getPropertyFilterPresenceValue(kind, key));
  };

  for (const [key, property] of properties) {
    if (property.type === "number") {
      if (typeof property.value === "number") {
        setField("number", key, property.value);
      }

      continue;
    }

    if (property.type === "checkbox") {
      if (typeof property.value === "boolean") {
        setField("boolean", key, property.value);
      }

      continue;
    }

    if (property.type === "date") {
      if (typeof property.value !== "string") continue;

      const value = getDateValue(property.value);

      if (value !== undefined) setField("date", key, value);

      continue;
    }

    const values = Array.isArray(property.value) ? property.value : [property.value];

    setField("text", key, [
      "present:",
      ...values
        .filter((value): value is string => typeof value === "string")
        .map(getTextPropertyFilterValue)
    ]);
  }

  return { fields, presence };
};
const getSearchDocumentDetails = (
  content: ContentNode,
  sourceProperties?: Record<string, ContentProperty>
): SearchDocumentDetails => {
  const properties = sourceProperties || getContentBlocks(content).properties;
  const propertyEntries = Object.entries(properties);
  const propertyFilterDetails = getPropertyFilterFields(propertyEntries);

  return {
    chunks: getSearchContentChunks(content),
    propertyFilterFields: propertyFilterDetails.fields,
    propertyFilterPresence: propertyFilterDetails.presence,
    propertyText: propertyEntries.map(([, property]) => formatPropertyText(property)),
    propertyValues: propertyEntries.map(([key, property]) => getPropertyValue(key, property))
  };
};
const findChunkEnd = (content: string, start: number): number => {
  const maximumEnd = Math.min(start + SEARCH_CHUNK_MAX_CHARACTERS, content.length);

  if (maximumEnd === content.length) return maximumEnd;

  const minimumEnd = start + Math.floor(SEARCH_CHUNK_MAX_CHARACTERS / 2);
  const paragraphEnd = content.lastIndexOf("\n", maximumEnd);

  if (paragraphEnd >= minimumEnd) return paragraphEnd;

  const wordEnd = content.lastIndexOf(" ", maximumEnd);

  return wordEnd >= minimumEnd ? wordEnd : maximumEnd;
};
const splitSearchContent = (content: string): string[] => {
  if (!content) return [""];

  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    const end = findChunkEnd(content, start);
    const chunk = content.slice(start, end).trim();

    if (chunk) chunks.push(chunk);
    if (end === content.length) break;

    start = Math.max(end - SEARCH_CHUNK_OVERLAP_CHARACTERS, start + 1);

    while (start < end && !/\s/.test(content[start] || "")) {
      start += 1;
    }
  }

  return chunks.length > 0 ? chunks : [""];
};
const getSearchContentSections = (content: ContentNode): SearchContentSection[] => {
  const contentBlocks = getSearchContentBlocks(content);
  const headingPath: SearchHeading[] = [];
  const sections: SearchContentSection[] = [];
  let section: SearchContentSection = { blocks: [], headingPath: [] };

  for (const block of contentBlocks) {
    if (block.resetHeading) {
      if (section.blocks.length > 0) sections.push(section);

      headingPath.length = 0;
      section = { blocks: [], headingPath: [] };
      continue;
    }

    if (block.headingLevel) {
      if (section.blocks.length > 0) sections.push(section);

      while (
        headingPath.length > 0 &&
        headingPath[headingPath.length - 1]!.level >= block.headingLevel
      ) {
        headingPath.pop();
      }

      headingPath.push({ level: block.headingLevel, text: block.text });
      section = { blocks: [], headingPath: headingPath.map(({ text }) => text) };
      continue;
    }

    section.blocks.push(block.text);
  }

  if (section.blocks.length > 0 || section.headingPath.length > 0 || sections.length === 0) {
    sections.push(section);
  }

  return sections;
};
const getSearchContentChunks = (content: ContentNode): SearchContentChunk[] => {
  return getSearchContentSections(content).flatMap((section, sectionIndex) => {
    return splitSearchContent(section.blocks.join("\n")).map((chunk, sectionChunkIndex) => ({
      content: chunk,
      headingPath: section.headingPath,
      sectionChunkIndex,
      sectionIndex
    }));
  });
};
const getSearchDocumentID = (source: SearchDocumentSource, chunkIndex: number): string => {
  if (source.scope === "published") {
    return `${source.channelID}-${source.entryID}-${chunkIndex}`;
  }

  return `${source.entryID}-${chunkIndex}`;
};
const getEmbeddingText = (
  title: string,
  content: string,
  headingPath: string[],
  propertyText: string[],
  collectionPath: string[]
): string => {
  return normalizeText(
    [title, collectionPath.join(" / "), headingPath.join(" > "), ...propertyText, content].join(
      "\n"
    )
  );
};
const buildSearchDocuments = <TDocument extends SearchDocument>(
  source: SearchDocumentSource
): Array<BuiltSearchDocument<TDocument>> => {
  const details = getSearchDocumentDetails(source.content, source.properties);
  const ancestorCollectionIDs = source.ancestorCollectionIDs || [];
  const restrictedBoundaryIDs = source.restrictedBoundaryIDs || [];
  const collectionPath = source.collectionPath || [];
  const updatedAt = Math.floor(source.updatedAt.getTime() / 1000);

  return details.chunks.map((chunk, chunkIndex) => {
    const heading = chunk.headingPath[chunk.headingPath.length - 1] || "";
    const baseDocument = {
      id: getSearchDocumentID(source, chunkIndex),
      workspaceID: source.workspaceID,
      entryID: source.entryID,
      collectionID: source.collectionID,
      ancestorCollectionIDs,
      restrictedBoundaryIDs,
      collectionPath,
      title: source.title,
      heading,
      headingPath: chunk.headingPath,
      content: chunk.content,
      propertyText: details.propertyText,
      propertyValues: details.propertyValues,
      propertyFilterPresence: details.propertyFilterPresence,
      ...details.propertyFilterFields,
      chunkIndex,
      chunkCount: details.chunks.length,
      sectionIndex: chunk.sectionIndex,
      sectionChunkIndex: chunk.sectionChunkIndex,
      updatedAt
    };
    const document =
      source.scope === "published"
        ? {
            ...baseDocument,
            scope: source.scope,
            channelID: source.channelID,
            channelCode: source.channelCode,
            versionID: source.versionID
          }
        : { ...baseDocument, scope: source.scope };

    return {
      document: document as TDocument,
      embeddingText: getEmbeddingText(
        source.title,
        chunk.content,
        chunk.headingPath,
        details.propertyText,
        collectionPath
      )
    };
  });
};
const buildCurrentSearchDocuments = (
  source: CurrentSearchDocumentSource
): Array<BuiltSearchDocument<CurrentSearchDocument>> => {
  return buildSearchDocuments<CurrentSearchDocument>(source);
};
const buildPublishedSearchDocuments = (
  source: PublishedSearchDocumentSource
): Array<BuiltSearchDocument<PublishedSearchDocument>> => {
  return buildSearchDocuments<PublishedSearchDocument>(source);
};

export { buildCurrentSearchDocuments, buildPublishedSearchDocuments };
