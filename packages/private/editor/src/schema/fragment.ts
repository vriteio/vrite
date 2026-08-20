import { mergeAttributes, Node } from "@tiptap/core";

const MAX_FRAGMENT_NAME_LENGTH = 50;
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

export { Fragment, MAX_FRAGMENT_NAME_LENGTH };
