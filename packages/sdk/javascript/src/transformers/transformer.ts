import { JSONContent, JSONContentAttrs } from "../api";

interface ContentTransformerConfig {
  applyInlineFormatting(type: string, attrs: JSONContentAttrs, content: string): string;
  transformNode(type: string, attrs: JSONContentAttrs, content: string): string;
}

type ContentTransformer = (...content: JSONContent[]) => string;

const createContentTransformer = (config: ContentTransformerConfig): ContentTransformer => {
  const transformer = (...content: JSONContent[]): string => {
    return content
      .map((doc) => {
        if (doc.type === "text") {
          let content = doc?.text || "";

          doc.marks?.forEach((mark) => {
            content = config.applyInlineFormatting(mark.type, mark.attrs, content);
          });

          return content;
        }

        return config.transformNode(doc.type, doc.attrs || {}, transformer(...(doc.content || [])));
      })
      .join("");
  };

  return transformer;
};

export { createContentTransformer };
export type { ContentTransformer };
