import { Placeholder as BasePlaceholder } from "@tiptap/extension-placeholder";

const Placeholder = BasePlaceholder.configure({
  showOnlyCurrent: false,
  placeholder({ node }) {
    return node.type.name === "title" ? "New entry" : "Write, type / to add blocks";
  }
});

export { Placeholder };
