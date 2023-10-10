/* eslint-disable no-use-before-define */
import {
  createOutputTransformer,
  createContentWalker,
  JSONContentNodeWalker,
  JSONContentNode
} from "@vrite/sdk/transformers";

const mediumOutputTransformer = createOutputTransformer<string>((contentNode) => {
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
  const transformHeading = (
    nodeWalker: JSONContentNodeWalker<JSONContentNode["heading"]>
  ): string => {
    const level = `${nodeWalker.node.attrs?.level || 1}`;
    const content = transformTextNode(
      nodeWalker as JSONContentNodeWalker<JSONContentNode["heading"]>
    );

    if (["1", "2"].includes(level)) return `# ${content}`;
    if (["3", "4"].includes(level)) return `## ${content}`;

    return `**${content}**`;
  };
  const transformContentNode = (
    nodeWalker: JSONContentNodeWalker<
      JSONContentNode["listItem" | "blockquote" | "doc" | "element"]
    >
  ): string => {
    return nodeWalker.children
      .map((child) => {
        const nodeType = child.node.type;
        const previousSibling = child.previousSibling();
        const isPreviousSiblingList = ["bulletList", "orderedList"].includes(
          previousSibling?.node.type || ""
        );

        switch (nodeType) {
          case "paragraph":
            return `\n${transformTextNode(
              child as JSONContentNodeWalker<JSONContentNode["paragraph"]>
            )}\n`;
          case "bulletList":
          case "orderedList":
            return `${isPreviousSiblingList ? "\n" : ""}${transformList(
              child as JSONContentNodeWalker<JSONContentNode["bulletList" | "orderedList"]>
            )}\n`;
          case "horizontalRule":
            return "\n---\n";
          case "image":
            return `\n![${child.node.attrs?.alt || ""}](${child.node.attrs?.src || ""})\n`;
          case "embed":
            return `\n${child.node.attrs?.src || ""}\n`;
          case "heading":
            return `\n${transformHeading(
              child as JSONContentNodeWalker<JSONContentNode["heading"]>
            )}\n`;
          case "codeBlock":
            return `\n\`\`\`${child.node.attrs?.lang || ""}\n${transformTextNode(
              child as JSONContentNodeWalker<JSONContentNode["codeBlock"]>
            )}\n\`\`\`\n`;
          case "element":
            return `\n${transformContentNode(
              child as JSONContentNodeWalker<JSONContentNode["element"]>
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
    listWalker: JSONContentNodeWalker<JSONContentNode["bulletList" | "orderedList"]>
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

export { mediumOutputTransformer };
