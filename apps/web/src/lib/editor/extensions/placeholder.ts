import { Placeholder as BasePlaceholder } from "@tiptap/extension-placeholder";

const Placeholder = BasePlaceholder.configure({
  showOnlyCurrent: true,
  placeholder: ({ node, editor }) => {
    if (node.type.name === "paragraph" && editor.state.doc.firstChild === node) {
      return "Write away...";
    }

    return "";
  }
});

export { Placeholder };
