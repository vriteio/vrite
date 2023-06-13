import * as Y from "yjs";
import { generateJSON } from "@tiptap/html";
import { TiptapTransformer } from "@hocuspocus/transformer";
import {
  Blockquote,
  Bold,
  BulletList,
  Code,
  CodeBlock,
  Document,
  ListItem,
  TaskItem,
  Embed,
  HardBreak,
  Heading,
  Highlight,
  HorizontalRule,
  Image,
  Italic,
  Link,
  OrderedList,
  Paragraph,
  Strike,
  Subscript,
  Superscript,
  TaskList,
  Text
} from "@vrite/editor";

type Attrs = Record<string, string | number | boolean>;
interface DocJSON {
  type: string;
  content?: DocJSON[];
  text?: string;
  attrs?: Attrs;
  marks?: Array<{ type: string; attrs: Attrs }>;
}

const bufferToJSON = (buffer: Buffer): DocJSON => {
  const doc = new Y.Doc();

  Y.applyUpdate(doc, new Uint8Array(buffer));

  return TiptapTransformer.fromYdoc(doc, "default");
};
const htmlToJSON = (html: string): DocJSON => {
  return generateJSON(html, [
    Document,
    Paragraph,
    Text,
    HardBreak,
    Bold,
    Italic,
    Strike,
    Code,
    Link,
    Highlight,
    Subscript,
    Superscript,
    Heading,
    BulletList,
    OrderedList,
    TaskList,
    Blockquote,
    CodeBlock,
    HorizontalRule,
    Image,
    Embed,
    TaskItem,
    ListItem
  ]) as DocJSON;
};
const jsonToBuffer = (json: DocJSON): Buffer => {
  const doc = TiptapTransformer.toYdoc(json, "default");

  return Buffer.from(Y.encodeStateAsUpdate(doc));
};

export { bufferToJSON, htmlToJSON, jsonToBuffer };
export type { DocJSON };
