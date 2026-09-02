import type { SearchPropertyValue } from "./types";

interface SearchTextPropertyFilter {
  kind: "text";
  key: string;
  operator: "all" | "any" | "none";
  values: string[];
}

interface SearchNumberPropertyFilter {
  kind: "number";
  key: string;
  operator:
    "equals" | "greaterThan" | "greaterThanOrEqual" | "lessThan" | "lessThanOrEqual" | "notEquals";
  value: number;
}

interface SearchBooleanPropertyFilter {
  kind: "boolean";
  key: string;
  value: boolean;
}

interface SearchDatePropertyFilter {
  kind: "date";
  key: string;
  operator:
    "equals" | "greaterThan" | "greaterThanOrEqual" | "lessThan" | "lessThanOrEqual" | "notEquals";
  value: string;
}

interface SearchInput {
  collectionID?: string;
  filters: SearchPropertyFilter[];
  limit: number;
  query: string;
  semantic: boolean;
}

interface PublishedSearchInput extends SearchInput {
  channel: string;
}

interface AskHistoryMessage {
  content: string;
  role: "assistant" | "user";
}

interface AskInput {
  collectionID?: string;
  filters: SearchPropertyFilter[];
  history: AskHistoryMessage[];
  question: string;
}

interface PublishedAskInput extends AskInput {
  channel: string;
}

interface SearchResultItem {
  channel?: string;
  collectionID?: string;
  collectionPath: string[];
  entryID: string;
  headingPath: string[];
  properties: SearchPropertyValue[];
  snippet: string;
  title: string;
  updatedAt: string;
  versionID?: string;
}

interface SearchResult {
  results: SearchResultItem[];
}

interface AskSource extends SearchResultItem {
  id: number;
  relevance: number;
}

interface AskResult {
  answer: string;
  sources: AskSource[];
}

type SearchPropertyFilter =
  | SearchBooleanPropertyFilter
  | SearchDatePropertyFilter
  | SearchNumberPropertyFilter
  | SearchTextPropertyFilter;

export type {
  AskHistoryMessage,
  AskInput,
  AskResult,
  AskSource,
  PublishedAskInput,
  PublishedSearchInput,
  SearchBooleanPropertyFilter,
  SearchDatePropertyFilter,
  SearchInput,
  SearchNumberPropertyFilter,
  SearchPropertyFilter,
  SearchResult,
  SearchResultItem,
  SearchTextPropertyFilter
};
