import { mergeAttributes, Node } from "@tiptap/core";

const MAX_ENTRY_TITLE_LENGTH = 300;
const normalizeEntryTitle = (title: string) => title.trim() || "Untitled";

const Title = Node.create({
  name: "title",
  content: "text*",
  priority: 1000,
  parseHTML() {
    return [{ tag: "header[data-type='title']" }];
  },
  renderHTML({ HTMLAttributes }) {
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

export { MAX_ENTRY_TITLE_LENGTH, Title, normalizeEntryTitle };
