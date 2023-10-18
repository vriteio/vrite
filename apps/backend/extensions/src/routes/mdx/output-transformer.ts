/* eslint-disable no-use-before-define */
import {
  createContentWalker,
  JSONContentNodeWalker,
  JSONContentNode,
  GenericJSONContentNode
} from "@vrite/sdk/transformers";
import { format } from "prettier/standalone";
import babelPlugin from "prettier/plugins/babel";
import estreePlugin from "prettier/plugins/estree";
import markdownPlugin from "prettier/plugins/markdown";
import { ContentPiece } from "@vrite/sdk/api";
import { convert as convertToText } from "html-to-text";
import { dump } from "js-yaml";
import dayjs from "dayjs";
import type { Plugin } from "prettier";

const processCode = async (code: string, hasContent?: boolean): Promise<string> => {
  const codeTagClosed = code?.trim().replace(/>$/, "/>") || "";
  const formattedCode = await format(codeTagClosed, {
    parser: "babel-ts",
    plugins: [babelPlugin, estreePlugin as Plugin],
    printWidth: 60,
    trailingComma: "none",
    singleQuote: false
  });

  return formattedCode.replace(/ *?\/>;/gm, hasContent ? ">" : "/>").trim();
};
const mdxAsyncOutputTransformer = async (
  contentNode: GenericJSONContentNode,
  contentPiece?: Pick<
    ContentPiece<Record<string, any>>,
    | "date"
    | "title"
    | "description"
    | "tags"
    | "members"
    | "slug"
    | "filename"
    | "coverUrl"
    | "coverAlt"
    | "customData"
    | "canonicalLink"
    | "coverWidth"
  >
): Promise<string> => {
  const contentWalker = createContentWalker(contentNode);
  const transformText = (textWalker: JSONContentNodeWalker<JSONContentNode["text"]>): string => {
    let output = "";

    if (textWalker.node.type === "text") {
      output = textWalker.node.text;
      textWalker.node.marks?.forEach((mark) => {
        switch (mark.type) {
          case "link":
            output = `[${output}](${mark.attrs.href})`;
            break;
          case "bold":
            output = `**${output}**`;
            break;
          case "code":
            output = `\`${output}\``;
            break;
          case "italic":
            output = `_${output}_`;
            break;
          case "strike":
            output = `~~${output}~~`;
            break;
          default:
            break;
        }
      });
    }

    return output;
  };
  const transformTextNode = (
    paragraphWalker: JSONContentNodeWalker<JSONContentNode["paragraph" | "heading" | "codeBlock"]>
  ): string => {
    return `${paragraphWalker.children
      .map((child) => {
        if (child.node.type === "text") {
          return transformText(child as JSONContentNodeWalker<JSONContentNode["text"]>);
        }

        return "\n";
      })
      .join("")}`;
  };
  const transformTable = (tableWalker: JSONContentNodeWalker<JSONContentNode["table"]>): string => {
    let output = "";

    tableWalker.children.forEach((tableRowWalker, rowIndex) => {
      let isHeader = false;

      const columns = tableRowWalker.children.map((tableCellWalker) => {
        if (tableCellWalker.node.type === "tableHeader") {
          isHeader = true;
        }

        return tableCellWalker.children.map(transformTextNode).join("\n");
      });

      if (rowIndex === tableWalker.children.length - 1) {
        output += `| ${columns.map((row) => row.replace(/\n/g, " ")).join(" | ")} |`;
      } else {
        output += `| ${columns.map((row) => row.replace(/\n/g, " ")).join(" | ")} |\n`;
      }

      if (isHeader && rowIndex === 0) {
        output += `| ${columns.map(() => "---").join(" | ")} |\n`;
      }
    });

    return output;
  };
  const transformCodeBlock = (
    codeBlockWalker: JSONContentNodeWalker<JSONContentNode["codeBlock"]>
  ): string => {
    const attrs = codeBlockWalker.node.attrs || {};

    let openingTag = `${attrs?.lang || ""}`;

    if (attrs?.title) {
      openingTag += ` title="${attrs.title}"`;
    }

    if (attrs?.meta) {
      openingTag += ` ${attrs.meta}`;
    }

    return `\`\`\`${openingTag}\n${transformTextNode(codeBlockWalker)}\n\`\`\``;
  };
  const transformElement = async (
    elementWalker: JSONContentNodeWalker<JSONContentNode["element"]>
  ): Promise<string> => {
    const { attrs } = elementWalker.node;

    if (attrs.type === "Import" && elementWalker.children[0]?.node?.type === "codeBlock") {
      return `${transformTextNode(
        elementWalker.children[0] as JSONContentNodeWalker<JSONContentNode["codeBlock"]>
      ).trim()}`;
    }

    const keyValueProps = Object.entries(attrs.props).map(([key, value]) => {
      if (value === true) return key;

      const useBrackets = typeof value !== "string" || value.includes("\n") || value.includes(`"`);

      return `${key}=${useBrackets ? "{" : ""}${JSON.stringify(value)}${useBrackets ? "}" : ""}`;
    });
    const openingTag = await processCode(
      `<${attrs.type}${keyValueProps.length ? " " : ""}${keyValueProps.join(" ")}>`,
      elementWalker.children.length > 0
    );

    if (elementWalker.children.length > 0) {
      return `${openingTag}\n${(
        await transformContentNode(
          elementWalker as JSONContentNodeWalker<JSONContentNode["element"]>
        )
      )
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")}\n</${attrs.type}>`;
    }

    return openingTag;
  };
  const transformContentNode = async (
    nodeWalker: JSONContentNodeWalker<
      JSONContentNode["listItem" | "taskItem" | "blockquote" | "doc" | "element"]
    >
  ): Promise<string> => {
    const output: string[] = [];

    for await (const child of nodeWalker.children) {
      const processChildNode = async (): Promise<string> => {
        const nodeType = child.node.type;
        const previousSibling = child.previousSibling();
        const isPreviousSiblingList = ["bulletList", "orderedList", "taskList"].includes(
          previousSibling?.node.type || ""
        );

        switch (nodeType) {
          case "paragraph":
            return `\n${transformTextNode(
              child as JSONContentNodeWalker<JSONContentNode["paragraph"]>
            )}\n`;
          case "bulletList":
          case "orderedList":
          case "taskList":
            return `${isPreviousSiblingList ? "\n" : ""}${await transformList(
              child as JSONContentNodeWalker<
                JSONContentNode["bulletList" | "orderedList" | "taskList"]
              >
            )}\n`;
          case "table":
            return `\n${transformTable(
              child as JSONContentNodeWalker<JSONContentNode["table"]>
            )}\n`;
          case "horizontalRule":
            return "\n---\n";
          case "image":
            return `\n![${child.node.attrs?.alt || ""}](${child.node.attrs?.src || ""})\n`;
          case "heading":
            return `\n${"#".repeat(child.node.attrs?.level || 1)} ${transformTextNode(
              child as JSONContentNodeWalker<JSONContentNode["heading"]>
            )}\n`;
          case "codeBlock":
            return `\n${transformCodeBlock(
              child as JSONContentNodeWalker<JSONContentNode["codeBlock"]>
            )}\n`;
          case "element":
            return `${child.node.attrs.type === "Import" ? "" : "\n"}${await transformElement(
              child as JSONContentNodeWalker<JSONContentNode["element"]>
            )}\n`;
          case "blockquote":
            return `\n${(
              await transformContentNode(
                child as JSONContentNodeWalker<JSONContentNode["blockquote"]>
              )
            )
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n")}\n`;
          default:
            return "";
        }
      };

      output.push(await processChildNode());
    }

    return output.join("").trim();
  };
  const transformList = async (
    listWalker: JSONContentNodeWalker<JSONContentNode["bulletList" | "orderedList" | "taskList"]>
  ): Promise<string> => {
    const listItems: Array<{ content: string; node: JSONContentNode["listItem" | "taskItem"] }> =
      [];

    for await (const nodeWalker of listWalker.children) {
      listItems.push({
        content: await transformContentNode(nodeWalker),
        node: nodeWalker.node
      });
    }

    return listItems
      .map(({ content, node }, index) => {
        let prefix = "";
        let indent = 0;

        if (listWalker.node.type === "taskList" && node.type === "taskItem") {
          prefix = `${node.attrs?.checked ? "- [x] " : "- [ ] "} `;
          indent = 2;
        }

        if (listWalker.node.type === "orderedList") {
          const start = listWalker.node.attrs?.start || 1;

          prefix = `${start + index}. `;
          indent = prefix.length;
        }

        if (listWalker.node.type === "bulletList") {
          prefix = "- ";
          indent = prefix.length;
        }

        return content
          .split("\n")
          .map((line, lineIndex) => {
            if (lineIndex === 0) {
              return `${prefix}${line}`;
            }

            return `${" ".repeat(indent)}${line}`;
          })
          .join("\n");
      })
      .join("\n");
  };
  const content = await transformContentNode(
    contentWalker as JSONContentNodeWalker<JSONContentNode["doc"]>
  );
  const { __extensions__, ...customData } = contentPiece?.customData || {};

  let frontmatter = dump(
    {
      ...(contentPiece?.canonicalLink && { canonicalLink: contentPiece.canonicalLink }),
      ...(contentPiece?.coverUrl && { coverUrl: contentPiece.coverUrl }),
      ...(contentPiece?.description && {
        description: convertToText(contentPiece.description, { wordwrap: false })
      }),
      ...(contentPiece?.date && { date: dayjs(contentPiece.date).format("YYYY-MM-DD") }),
      ...(contentPiece?.slug && { slug: contentPiece.slug }),
      ...(contentPiece?.title && { title: contentPiece.title }),
      ...customData
    },
    { skipInvalid: true, forceQuotes: true, quotingType: '"' }
  );

  if (frontmatter.trim() === "{}") {
    frontmatter = "";
  }

  return (
    await format(
      `${frontmatter ? "---" : ""}\n${frontmatter.trim()}\n${
        frontmatter ? "---" : ""
      }\n\n${content.trim()}`,
      { plugins: [markdownPlugin], parser: "mdx" }
    )
  ).trim();
};

export { mdxAsyncOutputTransformer };
