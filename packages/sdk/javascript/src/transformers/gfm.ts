import { createContentTransformer } from "./transformer";

/**
 * @deprecated Use `gfmOutputTransformer` instead.
 */
const gfmTransformer = createContentTransformer({
  applyInlineFormatting(type, attrs, content) {
    switch (type) {
      case "link":
        return `[${content}](${attrs.href})`;
      case "bold":
        return `**${content}**`;

      case "code":
        return `\`${content}\``;

      case "italic":
        return `_${content}_`;

      case "strike":
        return `~~${content}~~`;

      default:
        return content;
    }
  },
  transformNode(type, attrs, content) {
    const listItemRegex = /^(?:- \[(?: |x)\]|-|(?:\d+\.))\s/;
    const processOrderedList = (): string => {
      let start = Number(attrs.start ?? 1);

      return `\n${content
        .split("\n\n\n")
        .filter((listItem) => listItem)
        .map((listItem) => {
          if (listItemRegex.test(listItem.trim())) {
            return `${listItem
              .split("\n")
              .filter((line) => line)
              .map((line) => `   ${line}`)
              .join("\n")}`;
          }

          const prefix = `${start}. `;
          const result = `${listItem
            .split("\n")
            .map((listItem, index) => {
              if (index === 0) {
                return `${prefix}${listItem}`;
              }

              return `${prefix.replace(/./g, " ")}${listItem}`;
            })
            .join("\n")
            .trim()}`;

          start += 1;

          return result;
        })
        .join("\n")}\n`;
    };
    const processTableRow = (): string => {
      const headerRow = content.split(" |--| ");

      if (headerRow.length > 1) {
        return `| ${headerRow.join(" | ")}\n${headerRow.map(() => "---").join(" | ")}\n`;
      }

      const row = content.split(" | ");

      return `| ${row.join(" | ")}\n`;
    };

    switch (type) {
      case "paragraph":
        return `\n${content}\n`;
      case "hardBreak":
        return "\n";
      case "heading":
        return `\n${"#".repeat(Number(attrs?.level || 1))} ${content}\n`;
      case "blockquote":
        return `\n${content
          .split("\n")
          .map((line) => {
            if (!line) return ">";

            return `> ${line}`;
          })
          .join("\n")}\n`;
      case "image":
        return `\n![${attrs?.alt || ""}](${attrs?.src || ""})\n`;
      case "codeBlock":
        return `\n\`\`\`${attrs?.lang || ""}\n${content.trim()}\n\`\`\`\n`;
      case "bulletList":
        return `\n${content
          .split("\n\n\n")
          .filter((listItem) => listItem)
          .map((listItem) => {
            if (listItemRegex.test(listItem.trim())) {
              return `${listItem
                .split("\n")
                .filter((line) => line)
                .map((line) => `   ${line}`)
                .join("\n")}`;
            }

            return `${listItem
              .split("\n")
              .map((listItem, index) => {
                if (index === 0) {
                  return `- ${listItem}`;
                }

                return `  ${listItem}`;
              })
              .join("\n")
              .trim()}`;
          })
          .join("\n\n")}\n`;
      case "orderedList":
        return processOrderedList();
      case "taskList":
        return `\n${content}\n`;
      case "listItem":
        return `${content}\n`;
      case "taskItem":
        return `- [${attrs?.checked ? "x" : " "}] ${content}\n`;
      case "horizontalRule":
        return `\n---\n`;
      case "table":
        return `\n${content}\n`;
      case "tableRow":
        return processTableRow();
      case "tableCell":
        return `${content.trim()} | `;
      case "tableHeader":
        return `${content.trim()} |--| `;
      default:
        return content;
    }
  }
});

export { gfmTransformer };
