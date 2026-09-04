import { createHash } from "node:crypto";
import type { SchemaDefinition } from "./definition";

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
const hashSchemaValue = (value: unknown): string => {
  const normalizedValue = normalizeValue(value);

  return createHash("sha256").update(JSON.stringify(normalizedValue)).digest("hex");
};
const hashSchemaDefinition = (definition: SchemaDefinition): string => hashSchemaValue(definition);

export { hashSchemaDefinition, hashSchemaValue };
