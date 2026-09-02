import { createHash } from "node:crypto";
import type {
  SearchDatePropertyFilter,
  SearchNumberPropertyFilter,
  SearchPropertyFilter
} from "./query-types";
import type { SearchDocument, SearchPropertyValue } from "./types";

interface SearchFilterInput {
  allowedCollectionIDs?: string[];
  channel?: string;
  collectionID?: string;
  filters: SearchPropertyFilter[];
  workspaceID: string;
}

type SearchPropertyFilterKind = SearchPropertyFilter["kind"];

const COMPARISON_OPERATORS = {
  equals: "=",
  greaterThan: ">",
  greaterThanOrEqual: ">=",
  lessThan: "<",
  lessThanOrEqual: "<=",
  notEquals: "!="
} as const;
const PROPERTY_FILTER_FIELD_PREFIXES: Record<SearchPropertyFilterKind, string> = {
  boolean: "propertyFilterBoolean_",
  date: "propertyFilterDate_",
  number: "propertyFilterNumber_",
  text: "propertyFilterText_"
};
const escapeFilterValue = (value: string): string => {
  return `\`${value.replaceAll("\\", "\\\\").replaceAll("`", "\\`")}\``;
};
const getArrayFilterValue = (values: string[]): string => {
  return `[${values.map(escapeFilterValue).join(",")}]`;
};
const getComparisonFilter = (
  field: string,
  filter: SearchDatePropertyFilter | SearchNumberPropertyFilter,
  value: number
): string => {
  const operator = COMPARISON_OPERATORS[filter.operator];

  return `${field}:${operator}${value}`;
};
const getPropertyFilterField = (kind: SearchPropertyFilterKind, key: string): string => {
  const keyHash = createHash("sha256").update(key).digest("hex");

  return `${PROPERTY_FILTER_FIELD_PREFIXES[kind]}${keyHash}`;
};
const getPropertyFilterPresenceValue = (kind: SearchPropertyFilterKind, key: string): string => {
  const keyHash = createHash("sha256").update(key).digest("hex");

  return `${kind}:${keyHash}`;
};
const getTextPropertyFilterValue = (value: string): string => {
  return `value:${value.toLowerCase()}`;
};
const withPropertyFilterPresence = (
  kind: SearchPropertyFilterKind,
  key: string,
  valueFilter: string
): string => {
  const presenceValue = getPropertyFilterPresenceValue(kind, key);

  return `(propertyFilterPresence:=${escapeFilterValue(presenceValue)} && ${valueFilter})`;
};
const getPropertyFilter = (filter: SearchPropertyFilter): string => {
  const field = getPropertyFilterField(filter.kind, filter.key);

  if (filter.kind === "text") {
    const values = filter.values.map(getTextPropertyFilterValue);
    const valueFilter =
      filter.operator === "none"
        ? `${field}:!${getArrayFilterValue(values)}`
        : filter.operator === "all"
          ? values.map((value) => `${field}:=${escapeFilterValue(value)}`).join(" && ")
          : `${field}:=${getArrayFilterValue(values)}`;

    return withPropertyFilterPresence(filter.kind, filter.key, valueFilter);
  }

  if (filter.kind === "boolean") {
    return withPropertyFilterPresence(filter.kind, filter.key, `${field}:=${filter.value}`);
  }

  if (filter.kind === "date") {
    const value = Math.floor(new Date(filter.value).getTime() / 1000);

    return withPropertyFilterPresence(
      filter.kind,
      filter.key,
      getComparisonFilter(field, filter, value)
    );
  }

  return withPropertyFilterPresence(
    filter.kind,
    filter.key,
    getComparisonFilter(field, filter, filter.value)
  );
};
const comparePropertyValue = (
  actual: number,
  expected: number,
  operator: SearchDatePropertyFilter["operator"] | SearchNumberPropertyFilter["operator"]
): boolean => {
  if (operator === "equals") return actual === expected;
  if (operator === "notEquals") return actual !== expected;
  if (operator === "greaterThan") return actual > expected;
  if (operator === "greaterThanOrEqual") return actual >= expected;
  if (operator === "lessThan") return actual < expected;

  return actual <= expected;
};
const matchesPropertyFilter = (
  properties: SearchPropertyValue[],
  filter: SearchPropertyFilter
): boolean => {
  const property = properties.find(({ key }) => key === filter.key);

  if (!property) return false;

  if (filter.kind === "text") {
    if (!property.textValue) return false;

    const propertyValues = new Set(property.textValue.map((value) => value.toLowerCase()));
    const matches = filter.values.map((value) => {
      return propertyValues.has(value.toLowerCase());
    });

    if (filter.operator === "all") return matches.every(Boolean);
    if (filter.operator === "none") return matches.every((match) => !match);

    return matches.some(Boolean);
  }

  if (filter.kind === "boolean") return property.booleanValue === filter.value;

  const value = filter.kind === "date" ? property.dateValue : property.numberValue;
  const expected =
    filter.kind === "date" ? Math.floor(new Date(filter.value).getTime() / 1000) : filter.value;

  return typeof value === "number" && comparePropertyValue(value, expected, filter.operator);
};
const matchesSearchFilters = (
  document: SearchDocument,
  filters: SearchPropertyFilter[]
): boolean => {
  return filters.every((filter) => matchesPropertyFilter(document.propertyValues, filter));
};
const buildSearchFilter = (input: SearchFilterInput): string => {
  const filters = [`workspaceID:=${escapeFilterValue(input.workspaceID)}`];

  if (input.channel) {
    filters.push(`channelCode:=${escapeFilterValue(input.channel)}`);
  }

  if (input.allowedCollectionIDs) {
    filters.push(`collectionID:=${getArrayFilterValue(input.allowedCollectionIDs)}`);
  }

  if (input.collectionID) {
    const collectionID = escapeFilterValue(input.collectionID);

    filters.push(`(collectionID:=${collectionID} || ancestorCollectionIDs:=${collectionID})`);
  }

  filters.push(...input.filters.map(getPropertyFilter));

  return filters.join(" && ");
};
const getVectorQuery = (embedding: number[], limit: number): string => {
  return `embedding:([${embedding.join(",")}], k:${Math.max(limit * 3, 20)})`;
};

export {
  buildSearchFilter,
  getPropertyFilterField,
  getPropertyFilterPresenceValue,
  getTextPropertyFilterValue,
  getVectorQuery,
  matchesSearchFilters
};
export type { SearchFilterInput };
