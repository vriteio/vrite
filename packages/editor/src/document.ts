import { Document as BaseDocument } from "@tiptap/extension-document";

const Document = BaseDocument.extend({
  content: "block+"
});

export { Document };
