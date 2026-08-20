import { Placeholder as BasePlaceholder } from "@tiptap/extension-placeholder";

const Placeholder = BasePlaceholder.configure({
  showOnlyCurrent: false,
  placeholder({ node }) {
    if (node.type.name === "title") return "New entry";

    return window.matchMedia("(max-width: 767px)").matches
      ? "Write, tap + to add blocks"
      : "Write, type / to add blocks";
  }
});

export { Placeholder };
