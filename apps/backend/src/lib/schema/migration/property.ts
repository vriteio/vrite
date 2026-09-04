import type { PropertyType } from "#backend/lib/content";
import type { SchemaProperty, SchemaPropertyValue } from "../contract";

interface PropertyMigrationResult {
  contentLost: boolean;
  value: SchemaPropertyValue;
}
interface PropertyMigrationOptions {
  useDefault: boolean;
}

const getEmptyPropertyValue = (property: SchemaProperty): SchemaPropertyValue => {
  if (property.type === "checkbox") return false;
  if (property.type === "multi-select") return [];

  return "";
};
const getFallbackValue = (
  property: SchemaProperty,
  contentLost: boolean,
  options: PropertyMigrationOptions
): PropertyMigrationResult => {
  return {
    contentLost,
    value: options.useDefault ? property.defaultValue : getEmptyPropertyValue(property)
  };
};
const isPropertyValueEmpty = (type: PropertyType, value: unknown): boolean => {
  if (type === "multi-select") return !Array.isArray(value) || value.length === 0;

  return value === "" || value === null || value === undefined;
};
const migrateTextValue = (value: unknown): PropertyMigrationResult => {
  if (Array.isArray(value)) {
    return { contentLost: false, value: value.map(String).join(", ") };
  }

  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return { contentLost: false, value: String(value) };
  }

  return { contentLost: true, value: "" };
};
const migrateNumberValue = (
  property: SchemaProperty,
  value: unknown,
  options: PropertyMigrationOptions
): PropertyMigrationResult => {
  const numberValue = typeof value === "number" ? value : Number(value);
  const validSource = typeof value === "number" || typeof value === "string";

  if (validSource && value !== "" && Number.isFinite(numberValue)) {
    return { contentLost: false, value: String(numberValue) };
  }

  return getFallbackValue(property, true, options);
};
const migrateCheckboxValue = (
  property: SchemaProperty,
  value: unknown,
  options: PropertyMigrationOptions
): PropertyMigrationResult => {
  if (typeof value === "boolean") return { contentLost: false, value };
  if (value === "true" || value === "false") {
    return { contentLost: false, value: value === "true" };
  }

  return getFallbackValue(property, true, options);
};
const migrateSelectValue = (
  property: SchemaProperty,
  value: unknown,
  options: PropertyMigrationOptions
): PropertyMigrationResult => {
  if (Array.isArray(value)) {
    const firstValidIndex = value.findIndex((item) => property.options.includes(item));

    if (firstValidIndex === -1) {
      return getFallbackValue(property, value.length > 0, options);
    }

    return {
      contentLost: value.length > 1 || firstValidIndex > 0,
      value: value[firstValidIndex]
    };
  }

  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    const stringValue = String(value);

    if (property.options.includes(stringValue)) {
      return { contentLost: false, value: stringValue };
    }
  }

  return getFallbackValue(property, true, options);
};
const migrateMultiSelectValue = (
  property: SchemaProperty,
  value: unknown,
  options: PropertyMigrationOptions
): PropertyMigrationResult => {
  const values = Array.isArray(value) ? value.map(String) : [String(value)];
  const validValues = values.filter((item) => property.options.includes(item));

  if (validValues.length === 0) {
    return getFallbackValue(property, values.some(Boolean), options);
  }

  return {
    contentLost: validValues.length !== values.length,
    value: validValues
  };
};
const migratePropertyValue = (
  property: SchemaProperty,
  sourceType: PropertyType,
  value: unknown,
  options: PropertyMigrationOptions
): PropertyMigrationResult => {
  if (isPropertyValueEmpty(sourceType, value)) {
    return getFallbackValue(property, false, options);
  }

  if (property.type === "text") return migrateTextValue(value);
  if (property.type === "number") return migrateNumberValue(property, value, options);
  if (property.type === "checkbox") return migrateCheckboxValue(property, value, options);
  if (property.type === "select") return migrateSelectValue(property, value, options);
  if (property.type === "multi-select") {
    return migrateMultiSelectValue(property, value, options);
  }

  if (typeof value === "string") return { contentLost: false, value };

  return getFallbackValue(property, true, options);
};

export { getEmptyPropertyValue, isPropertyValueEmpty, migratePropertyValue };
export type { PropertyMigrationOptions, PropertyMigrationResult };
