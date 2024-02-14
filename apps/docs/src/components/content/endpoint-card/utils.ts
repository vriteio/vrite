import { OpenAPIV3 } from "openapi-types";

const getTypeString = (schema: OpenAPIV3.SchemaObject): string => {
  if (schema.anyOf) {
    return [
      ...new Set(
        schema.anyOf
          .filter((subSchema) => !("$ref" in subSchema))
          .map((subSchema) => getTypeString(subSchema as OpenAPIV3.SchemaObject).trim())
      )
    ]
      .filter(Boolean)
      .join(" | ");
  }

  if (schema.type === "array") {
    if ("type" in schema.items) {
      return `${schema.items?.type}[]`;
    }

    return "array";
  }

  if (Array.isArray(schema.type)) {
    return schema.type
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" | ");
  }

  return schema.type || "";
};
const getSchemaWithProperties = (schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject => {
  const expandableArrayItem = schema.type === "array" && "properties" in schema.items;

  if (expandableArrayItem) {
    schema = (schema as OpenAPIV3.ArraySchemaObject).items as OpenAPIV3.SchemaObject;
  }

  return schema;
};
const getDescription = (schema: OpenAPIV3.SchemaObject): string => {
  const enums = schema.enum || [];

  let output = schema.description || "";

  if (enums.length > 0) {
    output = output.replace(enums.map((value) => `\`${value}\``).join(" "), "").trim();
  }

  if (schema.default) {
    output = output.replace(`Default: ${schema.default}`, "").trim();
  }

  return output;
};

export { getTypeString, getDescription, getSchemaWithProperties };
