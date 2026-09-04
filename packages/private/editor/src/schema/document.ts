import { Document as BaseDocument } from "@tiptap/extension-document";
import type { EditorMode } from "#editor/client-types";

const Document = BaseDocument.extend({
  content: "title (block | property | fragment)+"
});
const createDocument = (mode: EditorMode) => {
  if (mode === "entry") return Document;

  return Document.extend({ content: "(paragraph | property | fragment)+" });
};

export { Document, createDocument };
