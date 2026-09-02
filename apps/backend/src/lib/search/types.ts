import type { ContentProperty, PropertyType } from "#backend/lib/content/blocks";
import type { ContentNode } from "#backend/lib/content/document";

interface SearchPropertyValue {
  key: string;
  name: string;
  type: PropertyType;
  textValue?: string[];
  numberValue?: number;
  booleanValue?: boolean;
  dateValue?: number;
}

interface SearchDocumentBase {
  id: string;
  workspaceID: string;
  entryID: string;
  collectionID: string;
  ancestorCollectionIDs: string[];
  restrictedBoundaryIDs: string[];
  collectionPath: string[];
  title: string;
  heading: string;
  headingPath: string[];
  content: string;
  propertyText: string[];
  propertyValues: SearchPropertyValue[];
  propertyFilterPresence: string[];
  chunkIndex: number;
  chunkCount: number;
  sectionIndex: number;
  sectionChunkIndex: number;
  updatedAt: number;
}

interface CurrentSearchDocument extends SearchDocumentBase {
  scope: "current";
}

interface PublishedSearchDocument extends SearchDocumentBase {
  scope: "published";
  channelID: string;
  channelCode: string;
  versionID: string;
}

interface SearchDocumentSourceBase {
  workspaceID: string;
  entryID: string;
  collectionID: string;
  ancestorCollectionIDs?: string[];
  restrictedBoundaryIDs?: string[];
  collectionPath?: string[];
  title: string;
  content: ContentNode;
  properties?: Record<string, ContentProperty>;
  updatedAt: Date;
}

interface CurrentSearchDocumentSource extends SearchDocumentSourceBase {
  scope: "current";
}

interface PublishedSearchDocumentSource extends SearchDocumentSourceBase {
  scope: "published";
  channelID: string;
  channelCode: string;
  versionID: string;
}

interface SearchDocumentWithEmbeddingBase extends SearchDocumentBase {
  embedding: number[];
}

interface CurrentSearchDocumentWithEmbedding
  extends CurrentSearchDocument, SearchDocumentWithEmbeddingBase {}

interface PublishedSearchDocumentWithEmbedding
  extends PublishedSearchDocument, SearchDocumentWithEmbeddingBase {}

interface BuiltSearchDocument<TDocument extends SearchDocument> {
  document: TDocument;
  embeddingText: string;
}

type SearchDocument = CurrentSearchDocument | PublishedSearchDocument;
type SearchDocumentSource = CurrentSearchDocumentSource | PublishedSearchDocumentSource;
type SearchDocumentWithEmbedding =
  CurrentSearchDocumentWithEmbedding | PublishedSearchDocumentWithEmbedding;

export type {
  BuiltSearchDocument,
  CurrentSearchDocument,
  CurrentSearchDocumentSource,
  CurrentSearchDocumentWithEmbedding,
  PublishedSearchDocument,
  PublishedSearchDocumentSource,
  PublishedSearchDocumentWithEmbedding,
  SearchDocument,
  SearchDocumentSource,
  SearchDocumentWithEmbedding,
  SearchPropertyValue
};
