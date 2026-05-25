import { Document as BaseDocument } from "@tiptap/extension-document";

const Document = BaseDocument.extend({
  content: "title (property | fragment | block)*"
});

export { Document };
