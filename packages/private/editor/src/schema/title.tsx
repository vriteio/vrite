import { mergeAttributes, Node } from "@tiptap/core";

const Title = Node.create({
  name: "title",
  content: "text*",
  priority: 1000,
  parseHTML() {
    return [{ tag: "header[data-type='title']" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      `header`,
      mergeAttributes(HTMLAttributes, {
        "class": "not-prose",
        "data-type": "title"
      }),
      ["h1", {}, 0]
    ];
  }
});

export { Title };
