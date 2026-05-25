import { mergeAttributes, Node } from "@tiptap/core";

const Fragment = Node.create({
  name: "fragment",
  content: "block+",
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

export { Fragment };
