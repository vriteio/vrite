import { Document as BaseDocument } from "@tiptap/extension-document";

const Document = BaseDocument.extend({
  content: "title (block | property | fragment)+"
});

export { Document };
