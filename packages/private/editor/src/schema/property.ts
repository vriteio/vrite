import { mergeAttributes, Node } from "@tiptap/core";

const Property = Node.create({
  name: "property",
  isolating: true,
  defining: true,
  selectable: true,
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
        parseHTML: (element) => element.getAttribute("data-value") || "",
        renderHTML: (attributes) => {
          return { "data-value": attributes.value };
        }
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
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "property" }), 0];
  }
});

export { Property };
