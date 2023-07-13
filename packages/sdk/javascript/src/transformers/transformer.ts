import { JSONContent, JSONContentAttrs } from "../api";

interface ContentTransformerConfig<O = string> {
  applyInlineFormatting(
    type: string,
    attrs: JSONContentAttrs,
    content: O,
    ancestors: JSONContent[]
  ): O;
  transformNode(type: string, attrs: JSONContentAttrs, content: O, ancestors: JSONContent[]): O;
  processOutput?(nodes: O[]): O;
}

type ContentTransformer<O = string> = (...content: JSONContent[]) => O;

const createContentTransformer = <O = string>(
  config: ContentTransformerConfig<O>
): ContentTransformer<O> => {
  const transformerFn = (ancestors: JSONContent[] = [], ...content: JSONContent[]): O => {
    const x = content.map((doc) => {
      if (doc.type === "text") {
        let content = (doc?.text || "") as O;

        doc.marks?.forEach((mark) => {
          content = config.applyInlineFormatting(mark.type, mark.attrs, content, ancestors);
        });

        return content;
      }

      return config.transformNode(
        doc.type,
        doc.attrs || {},
        transformerFn([...ancestors, doc], ...(doc.content || [])),
        ancestors
      );
    });

    return (config.processOutput?.(x) || x.join("")) as O;
  };

  return (...content: JSONContent[]) => transformerFn([], ...content);
};

export { createContentTransformer };
export type { ContentTransformer };
