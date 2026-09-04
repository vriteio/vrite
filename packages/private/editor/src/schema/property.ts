import { mergeAttributes, Node } from "@tiptap/core";

const MAX_PROPERTY_NAME_LENGTH = 50;
const parseJSONAttribute = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const Property = Node.create({
  name: "property",
  isolating: true,
  defining: true,
  selectable: false,
  addAttributes() {
    return {
      type: {
        default: "text",
        parseHTML: (element) => element.getAttribute("data-property-type") || "text",
        renderHTML: (attributes) => {
          return { "data-property-type": attributes.type };
        }
      },
      label: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-label") || "Property",
        renderHTML: (attributes) => {
          return { "data-label": attributes.label };
        }
      },
      value: {
        default: "",
        parseHTML: (element) => {
          const type = element.getAttribute("data-property-type") || "text";
          const value = element.getAttribute("data-value") || "";
          const parsedValue = parseJSONAttribute<unknown>(value, value);

          if (type === "checkbox") return parsedValue === true;

          if (type === "multi-select") return Array.isArray(parsedValue) ? parsedValue : [];

          return typeof parsedValue === "string" ? parsedValue : value;
        },
        renderHTML: (attributes) => {
          return { "data-value": JSON.stringify(attributes.value) };
        }
      },
      options: {
        default: [],
        parseHTML: (element) =>
          parseJSONAttribute<string[]>(element.getAttribute("data-options"), []),
        renderHTML: (attributes) => {
          return { "data-options": JSON.stringify(attributes.options) };
        }
      },
      schemaFieldID: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-schema-field-id"),
        renderHTML: (attributes) => ({ "data-schema-field-id": attributes.schemaFieldID })
      },
      inherited: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-inherited") === "true",
        renderHTML: (attributes) => ({ "data-inherited": String(attributes.inherited) })
      },
      sourceCollectionID: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-source-collection-id"),
        renderHTML: (attributes) => ({
          "data-source-collection-id": attributes.sourceCollectionID
        })
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-type='property']"
      }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "property" })];
  }
});

export { MAX_PROPERTY_NAME_LENGTH, Property };
