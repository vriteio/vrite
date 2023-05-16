import Placeholder from "@tiptap/extension-placeholder";

const CustomPlaceholder = Placeholder.configure({
  showOnlyCurrent: true,
  placeholder: ({ node, editor }) => {
    if (node.type.name === "paragraph" && editor.state.doc.firstChild === node) {
      return "Write away...";
    }

    return "";
  }
});

export { CustomPlaceholder };
