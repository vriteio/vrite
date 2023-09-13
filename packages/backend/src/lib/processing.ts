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
  Text,
  Comment,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  Wrapper
} from "@vrite/editor";

type Attrs = Record<string, string | number | boolean>;
interface DocJSON {
  type: string;
  content?: DocJSON[];
  text?: string;
  attrs?: Attrs;
  marks?: Array<{ type: string; attrs: Attrs }>;
}

const docToBuffer = (doc: Y.Doc): Buffer => {
  return Buffer.from(Y.encodeStateAsUpdate(doc));
};
const docToJSON = (doc: Y.Doc): DocJSON => {
  return TiptapTransformer.fromYdoc(doc, "default");
};
const bufferToJSON = (buffer: Buffer): DocJSON => {
  const doc = new Y.Doc();

  Y.applyUpdate(doc, new Uint8Array(buffer));

  return docToJSON(doc);
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
    Wrapper,
    CodeBlock,
    HorizontalRule,
    Image,
    Embed,
    TaskItem,
    ListItem,
    Comment,
    Table,
    TableCell,
    TableHeader,
    TableRow
  ]) as DocJSON;
};
const jsonToBuffer = (json: DocJSON): Buffer => {
  const doc = TiptapTransformer.toYdoc(json, "default", [
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
    Wrapper,
    CodeBlock,
    HorizontalRule,
    Image,
    Embed,
    TaskItem,
    ListItem,
    Comment,
    Table,
    TableCell,
    TableHeader,
    TableRow
  ]);

  return Buffer.from(Y.encodeStateAsUpdate(doc));
};

export { bufferToJSON, htmlToJSON, jsonToBuffer, docToJSON, docToBuffer };
export type { DocJSON };
