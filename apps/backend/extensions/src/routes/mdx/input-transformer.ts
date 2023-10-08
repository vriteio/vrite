import { InputTransformer } from "@vrite/sdk/transformers";
import { mdxjs } from "micromark-extension-mdxjs";
import { fromMarkdown } from "mdast-util-from-markdown";
import { MdxJsxAttribute, MdxJsxExpressionAttribute, mdxFromMarkdown } from "mdast-util-mdx";
import { frontmatter } from "micromark-extension-frontmatter";
import { frontmatterFromMarkdown } from "mdast-util-frontmatter";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { toHtml } from "hast-util-to-html";
import { toHast, defaultHandlers } from "mdast-util-to-hast";
import babelPlugin from "prettier/plugins/babel";
import estreePlugin from "prettier/plugins/estree";
import { format } from "prettier/standalone";
import { load } from "js-yaml";
import dayjs from "dayjs";
import type { Plugin } from "prettier";
import type { RootContentMap } from "mdast";
import type { Element } from "hast";

const attributeProcessingPromises: Array<Promise<any>> = [];
const processAttribute = async (value: string): Promise<any> => {
  try {
    const processedValue = await format(value, {
      parser: "json-stringify",
      plugins: [babelPlugin, estreePlugin as Plugin]
    });

    return JSON.parse(processedValue);
  } catch (error) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }
};
const attributesToJSON = async (
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute>
): Promise<Record<string, any>> => {
  const output: Record<string, any> = {};

  for await (const attribute of attributes) {
    if (attribute.type === "mdxJsxAttribute") {
      if (typeof attribute.value === "string") {
        output[attribute.name] = attribute.value;
      } else if (attribute.value === null) {
        output[attribute.name] = true;
      } else if (attribute.value?.value) {
        const value = await processAttribute(attribute.value.value);

        output[attribute.name] = value;
      }
    }
  }

  return output;
};
const mdxAsyncInputTransformer = async (input: string): Promise<ReturnType<InputTransformer>> => {
  const mdast = fromMarkdown(input, {
    extensions: [gfm(), frontmatter(), mdxjs()],
    mdastExtensions: [gfmFromMarkdown(), frontmatterFromMarkdown(), mdxFromMarkdown()]
  });
  const hast = toHast(mdast, {
    handlers: {
      mdxjsEsm(state, node: RootContentMap["mdxjsEsm"]) {
        const result: Element = {
          tagName: "div",
          type: "element",
          properties: {
            "data-element": "true",
            "data-type": "Import"
          },
          children: [defaultHandlers.code(state, { type: "code", lang: "mdx", value: node.value })]
        };

        state.patch(node, result);

        return state.applyData(node, result);
      },
      paragraph(state, node: RootContentMap["paragraph"]) {
        if (node.children.length === 1 && node.children[0].type === "image") {
          return defaultHandlers.image(state, node.children[0]);
        }

        return defaultHandlers.paragraph(state, node);
      },
      code(state, node: RootContentMap["code"]) {
        const result = defaultHandlers.code(state, node);
        const meta: string[] = [];

        let title = "";

        (node.meta || "").split(" ").forEach((item) => {
          if (item.startsWith("title=")) {
            title = item.replace("title=", "");
          } else {
            meta.push(item);
          }
        });
        result.properties["data-title"] = title;
        result.properties["data-meta"] = meta.join(" ");

        return result;
      },
      list(state, node: RootContentMap["list"]) {
        const result = defaultHandlers.list(state, node);
        const className = `${result.properties.className || ""}`;

        if (className.includes("contains-task-list")) {
          result.properties.className = className.replace("contains-task-list", "").trim();
          if (!result.properties.className) delete result.properties.className;

          result.properties["data-type"] = "taskList";
        }

        return result;
      },
      mdxJsxFlowElement(state, node: RootContentMap["mdxJsxFlowElement"]) {
        const result: Element = {
          tagName: "div",
          type: "element",
          properties: {
            "data-element": "true",
            "data-type": node.name
          },
          children: state.all(node)
        };
        const promise = attributesToJSON(node.attributes).then((attributes) => {
          result.properties["data-props"] = JSON.stringify(attributes);
        });

        attributeProcessingPromises.push(promise);
        state.patch(node, result);

        return state.applyData(node, result);
      }
    }
  });
  const frontmatterYAML = mdast.children.find(
    (child) => child.type === "yaml"
  ) as RootContentMap["yaml"];
  const { canonicalLink, coverUrl, description, date, slug, title, ...customData } = (
    frontmatterYAML ? load(frontmatterYAML.value) : {}
  ) as Record<string, any>;

  await Promise.all(attributeProcessingPromises);

  const content = toHtml(hast);

  return {
    content,
    contentPiece: {
      ...(canonicalLink && { canonicalLink }),
      ...(coverUrl && { coverUrl }),
      ...(description && { description: `<p>${description}</p>` }),
      ...(date && { date: dayjs(date).toISOString() }),
      ...(slug && { slug }),
      ...(title && { title }),
      customData
    }
  };
};

export { mdxAsyncInputTransformer };
