import { createContentTransformer } from "./transformer";

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
        return `*${content}*`;

      case "strike":
        return `~~${content}~~`;

      default:
        return content;
    }
  },
  transformNode(type, attrs, content) {
    const listItemRegex = /^(?:-|(?:\d+\.))\s/;

    switch (type) {
      case "paragraph":
        return `\n${content}\n`;
      case "heading":
        return `\n${"#".repeat(Number(attrs?.level || 1))} ${content}\n`;
      case "blockquote":
        return `\n${content
          .split("\n")
          .filter((line) => line)
          .map((line) => {
            return `> ${line}`;
          })
          .join("\n")}\n`;
      case "image":
        return `\n![${attrs?.alt || ""}](${attrs?.src || ""})\n`;
      case "codeBlock":
        return `\n\`\`\`${attrs?.lang || ""}\n${content}\n\`\`\`\n`;
      case "bulletList":
        return `\n${content
          .split("\n\n")
          .filter((listItem) => listItem)
          .map((listItem) => {
            if (listItemRegex.test(listItem.trim())) {
              const list = `${listItem
                .split("\n")
                .filter((line) => line)
                .map((line) => `   ${line}`)
                .join("\n")}`;

              return list;
            }

            return `- ${listItem.trim()}`;
          })
          .join("\n")}\n`;
      case "orderedList":
        let start = Number(attrs.start ?? 1);
        return `\n${content
          .split("\n\n")
          .filter((listItem) => listItem)
          .map((listItem) => {
            if (listItemRegex.test(listItem.trim())) {
              const list = `${listItem
                .split("\n")
                .filter((line) => line)
                .map((line) => `   ${line}`)
                .join("\n")}`;

              return list;
            }

            const result = `${start}. ${listItem.trim()}`;

            start += 1;

            return result;
          })
          .join("\n")}\n`;
      case "taskList":
        return `\n${content
          .split("\n")
          .filter((listItem) => listItem)
          .map((listItem) => `- [${attrs?.checked ? "x" : " "}] ${listItem}`)
          .join("\n")}\n`;
      case "horizontalRule":
        return `\n---\n`;
      default:
        return content;
    }
  }
});

export { gfmTransformer };
