import { mergeAttributes, Node } from "@tiptap/core";

const MAX_FRAGMENT_NAME_LENGTH = 50;
const FRAGMENT_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "taskList",
  "horizontalRule"
] as const;

type FragmentBlockType = (typeof FRAGMENT_BLOCK_TYPES)[number];

const Fragment = Node.create({
  name: "fragment",
  content: "block+",
  selectable: false,
  addAttributes() {
    return {
      name: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-name") || "",
        renderHTML: (attributes) => {
          return { "data-name": attributes.name };
        }
      },
      allowedBlocks: {
        default: [...FRAGMENT_BLOCK_TYPES],
        parseHTML: (element) => {
          const value = element.getAttribute("data-allowed-blocks");

          if (!value) return [...FRAGMENT_BLOCK_TYPES];

          try {
            const parsed = JSON.parse(value);

            return Array.isArray(parsed)
              ? parsed.filter((item) => FRAGMENT_BLOCK_TYPES.includes(item))
              : [...FRAGMENT_BLOCK_TYPES];
          } catch {
            return [...FRAGMENT_BLOCK_TYPES];
          }
        },
        renderHTML: (attributes) => ({
          "data-allowed-blocks": JSON.stringify(attributes.allowedBlocks)
        })
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
        tag: "div[data-type='fragment']"
      }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "fragment" }), 0];
  }
});

export { FRAGMENT_BLOCK_TYPES, Fragment, MAX_FRAGMENT_NAME_LENGTH };
export type { FragmentBlockType };
