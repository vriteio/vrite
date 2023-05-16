import * as Y from "yjs";
import { TiptapTransformer } from "@hocuspocus/transformer";

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
const jsonToHTML = (json: DocJSON): string => {
  const textDocToHTML = (doc: DocJSON): string => {
    let html = doc.text || "";

    doc.marks?.forEach((mark) => {
      switch (mark.type) {
        case "link":
          html = `<a href="${mark.attrs.href}">${html}</a>`;
          break;
        case "bold":
          html = `<strong>${html}</strong>`;
          break;
        case "code":
          html = `<code>${html}</code>`;
          break;
        case "italic":
          html = `<em>${html}</em>`;
          break;
        case "strike":
          html = `<s>${html}</s>`;
          break;
        case "highlight":
          html = `<mark>${html}</mark>`;
          break;
        case "superscript":
          html = `<sup>${html}</sup>`;
          break;
        case "subscript":
          html = `<sub>${html}</sub>`;
          break;
      }
    });

    return html;
  };
  const stringifyAttributes = (
    attributes: Record<string, string | boolean | number | undefined>
  ): string => {
    const result: string[] = [];

    Object.entries(attributes).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        result.push(`${key}`);

        return;
      }

      if (typeof value !== "undefined") {
        result.push(`${key}="${value}"`);
      }
    });

    return result.join(" ");
  };
  const contentToHTML = (content: DocJSON[]): string => {
    return content
      .map((doc) => {
        switch (doc.type) {
          case "text":
            return textDocToHTML(doc);
          case "doc":
            return contentToHTML(doc.content || []);
          case "paragraph":
            return `<p>${contentToHTML(doc.content || [])}</p>`;
          case "heading":
            return `<h${doc.attrs?.level || 1}>${contentToHTML(doc.content || [])}</h${
              doc.attrs?.level || 1
            }>`;
          case "blockquote":
            return `<blockquote>${contentToHTML(doc.content || [])}</blockquote>`;
          case "image":
            return `<img ${stringifyAttributes({ src: doc.attrs?.src, alt: doc.attrs?.alt })}/>`;
          case "codeBlock":
            return `<pre ${stringifyAttributes({ lang: doc.attrs?.lang })}><code>${contentToHTML(
              doc.content || []
            )}</code></pre>`;
          case "embed":
            return `<iframe ${stringifyAttributes({
              "src": doc.attrs?.src,
              "data-type": doc.attrs?.embed
            })}></iframe>`;
          case "bulletList":
            return `<ul>${contentToHTML(doc.content || [])}</ul>`;
          case "orderedList":
            return `<ol>${contentToHTML(doc.content || [])}</ol>`;
          case "taskList":
            return `<ul data-type="taskList">${contentToHTML(doc.content || [])}</ul>`;
          case "taskItem":
            return `<li data-type="taskItem"><label><input ${stringifyAttributes({
              type: "checkbox",
              checked: doc.attrs?.checked
            })}/></label><div>${contentToHTML(doc.content || [])}</div></li>`;
          case "listItem":
            return `<li>${contentToHTML(doc.content || [])}</li>`;
          case "horizontalRule":
            return `<hr/>`;
        }

        return "";
      })
      .join("");
  };

  return contentToHTML([json]);
};

export { bufferToJSON, jsonToHTML };
export type { DocJSON };
