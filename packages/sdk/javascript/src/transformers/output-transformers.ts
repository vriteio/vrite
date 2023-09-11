/* eslint-disable no-use-before-define */
import {
  GenericJSONContentNode,
  JSONContentNode,
  JSONContentNodeWalker,
  createContentWalker
} from "./content-walker";
import { ContentPiece } from "../api";

type OutputTransformer<
  Output = string,
  CustomData extends Record<string, any> = Record<string, any>
> = (
  contentNode: GenericJSONContentNode,
  contentPiece?: Pick<
    ContentPiece<CustomData>,
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
) => Output;

const createOutputTransformer = <
  Output = string,
  CustomData extends Record<string, any> = Record<string, any>
>(
  outputTransformer: OutputTransformer<Output, CustomData>
): OutputTransformer<Output, CustomData> => {
  return outputTransformer;
};
const gfmOutputTransformer = createOutputTransformer<string>((contentNode) => {
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
  const transformContentNode = (
    nodeWalker: JSONContentNodeWalker<
      JSONContentNode["listItem" | "taskItem" | "blockquote" | "doc" | "wrapper"]
    >
  ): string => {
    return nodeWalker.children
      .map((child) => {
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
            return `${isPreviousSiblingList ? "\n" : ""}${transformList(
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
            return `\n\`\`\`${child.node.attrs?.lang || ""}\n${transformTextNode(
              child as JSONContentNodeWalker<JSONContentNode["codeBlock"]>
            )}\n\`\`\`\n`;
          case "wrapper":
            return `\n${transformContentNode(
              child as JSONContentNodeWalker<JSONContentNode["wrapper"]>
            )}\n`;
          case "blockquote":
            return `\n${transformContentNode(
              child as JSONContentNodeWalker<JSONContentNode["blockquote"]>
            )
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n")}\n`;
          default:
            return "";
        }
      })
      .join("")
      .trim();
  };
  const transformList = (
    listWalker: JSONContentNodeWalker<JSONContentNode["bulletList" | "orderedList" | "taskList"]>
  ): string => {
    return listWalker.children
      .map((nodeWalker) => {
        return {
          content: transformContentNode(nodeWalker),
          node: nodeWalker.node
        };
      })
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

  return transformContentNode(contentWalker as JSONContentNodeWalker<JSONContentNode["doc"]>);
});
const htmlOutputTransformer = createOutputTransformer<string>((contentNode) => {
  const contentWalker = createContentWalker(contentNode);
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
  const transformText = (textWalker: JSONContentNodeWalker<JSONContentNode["text"]>): string => {
    let output = "";

    if (textWalker.node.type === "text") {
      output = textWalker.node.text;
      textWalker.node.marks?.forEach((mark) => {
        switch (mark.type) {
          case "link":
            output = `<a href="${mark.attrs.href}">${output}</a>`;
            break;
          case "bold":
            output = `<strong>${output}</strong>`;
            break;
          case "code":
            output = `<code>${output}</code>`;
            break;
          case "italic":
            output = `<em>${output}</em>`;
            break;
          case "strike":
            output = `<s>${output}</s>`;
            break;
          case "highlight":
            output = `<mark>${output}</mark>`;
            break;
          case "superscript":
            output = `<sup>${output}</sup>`;
            break;
          case "subscript":
            output = `<sub>${output}</sub>`;
            break;
          default:
            break;
        }
      });
    }

    return output;
  };
  const transformContentNode = (
    nodeWalker: JSONContentNodeWalker<JSONContentNode[keyof JSONContentNode]>
  ): string => {
    const nodeType = nodeWalker.node.type;

    switch (nodeType) {
      case "doc":
        return (nodeWalker as JSONContentNodeWalker<JSONContentNode["doc"]>).children
          .map(transformContentNode)
          .join("");
      case "text":
        return transformText(nodeWalker as JSONContentNodeWalker<JSONContentNode["text"]>);
      case "paragraph":
        return `<p>${(nodeWalker as JSONContentNodeWalker<JSONContentNode["paragraph"]>).children
          .map((childWalker) => {
            if (childWalker.node.type === "text") {
              return transformText(childWalker as JSONContentNodeWalker<JSONContentNode["text"]>);
            }

            return "<br/>";
          })
          .join("")}</p>`;
      case "bulletList":
        return `<ul>${(nodeWalker as JSONContentNodeWalker<JSONContentNode["bulletList"]>).children
          .map(transformContentNode)
          .join("")}</ul>`;
      case "orderedList":
        return `<ol start="${nodeWalker.node.attrs.start}">${(
          nodeWalker as JSONContentNodeWalker<JSONContentNode["orderedList"]>
        ).children
          .map(transformContentNode)
          .join("")}</ol>`;
      case "taskList":
        return `<ul data-type="taskList">${(
          nodeWalker as JSONContentNodeWalker<JSONContentNode["taskList"]>
        ).children
          .map(transformContentNode)
          .join("")}</ul>`;
      case "listItem":
        return `<li>${(nodeWalker as JSONContentNodeWalker<JSONContentNode["listItem"]>).children
          .map(transformContentNode)
          .join("")}</li>`;
      case "taskItem":
        return `<li data-type="taskItem"><label><input ${stringifyAttributes({
          type: "checkbox",
          checked: nodeWalker.node.attrs.checked
        })} />${(nodeWalker as JSONContentNodeWalker<JSONContentNode["taskItem"]>).children
          .map(transformContentNode)
          .join("")}</label></li>`;
      case "wrapper":
        return `<div ${stringifyAttributes({
          "data-key": nodeWalker.node.attrs?.key
        })}>${(nodeWalker as JSONContentNodeWalker<JSONContentNode["wrapper"]>).children
          .map(transformContentNode)
          .join("")}</div>`;
      case "blockquote":
        return `<blockquote>${(
          nodeWalker as JSONContentNodeWalker<JSONContentNode["blockquote"]>
        ).children
          .map(transformContentNode)
          .join("")}</blockquote>`;
      case "heading":
        return `<h${nodeWalker.node.attrs.level}>${(
          nodeWalker as JSONContentNodeWalker<JSONContentNode["heading"]>
        ).children
          .map(transformContentNode)
          .join("")}</h${nodeWalker.node.attrs.level}>`;
      case "codeBlock":
        return `<pre ${stringifyAttributes({
          lang: nodeWalker.node.attrs?.lang
        })}><code>${(nodeWalker as JSONContentNodeWalker<JSONContentNode["codeBlock"]>).children
          .map(transformContentNode)
          .join("")}</code></pre>`;
      case "image":
        return `<img ${stringifyAttributes({
          src: nodeWalker.node.attrs?.src,
          alt: nodeWalker.node.attrs?.alt
        })}/>`;
      case "embed":
        return `<iframe ${stringifyAttributes({
          "src": nodeWalker.node.attrs?.src,
          "data-type": nodeWalker.node.attrs?.embed
        })}></iframe>`;
      case "horizontalRule":
        return "<hr/>";
      case "table":
        return `<table>${(nodeWalker as JSONContentNodeWalker<JSONContentNode["table"]>).children
          .map(transformContentNode)
          .join("")}</table>`;
      case "tableRow":
        return `<tr>${(nodeWalker as JSONContentNodeWalker<JSONContentNode["tableRow"]>).children
          .map(transformContentNode)
          .join("")}</tr>`;
      case "tableCell":
        return `<td>${(nodeWalker as JSONContentNodeWalker<JSONContentNode["tableCell"]>).children
          .flatMap((paragraphNode) => paragraphNode.children.map(transformContentNode))
          .join("")}</td>`;
      case "tableHeader":
        return `<th>${(nodeWalker as JSONContentNodeWalker<JSONContentNode["tableHeader"]>).children
          .flatMap((paragraphNode) => paragraphNode.children.map(transformContentNode))
          .join("")}</th>`;
      default:
        return "";
    }
  };

  return transformContentNode(contentWalker as JSONContentNodeWalker<JSONContentNode["doc"]>);
});

export { createOutputTransformer, gfmOutputTransformer, htmlOutputTransformer };
export type { OutputTransformer };
