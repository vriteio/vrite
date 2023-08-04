import { createContentTransformer } from "./transformer";

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
/**
 * @deprecated Use `htmlOutputTransformer` instead.
 */
const htmlTransformer = createContentTransformer({
  applyInlineFormatting(type, attrs, content) {
    switch (type) {
      case "link":
        return `<a href="${attrs.href}">${content}</a>`;
      case "bold":
        return `<strong>${content}</strong>`;

      case "code":
        return `<code>${content}</code>`;

      case "italic":
        return `<em>${content}</em>`;

      case "strike":
        return `<s>${content}</s>`;

      case "highlight":
        return `<mark>${content}</mark>`;

      case "superscript":
        return `<sup>${content}</sup>`;

      case "subscript":
        return `<sub>${content}</sub>`;

      default:
        return content;
    }
  },
  transformNode(type, attrs, content) {
    switch (type) {
      case "paragraph":
        return `<p>${content}</p>`;
      case "hardBreak":
        return "<br/>";
      case "heading":
        return `<h${attrs?.level || 1}>${content}</h${attrs?.level || 1}>`;
      case "blockquote":
        return `<blockquote>${content}</blockquote>`;
      case "image":
        return `<img ${stringifyAttributes({
          src: attrs?.src,
          alt: attrs?.alt
        })}/>`;
      case "codeBlock":
        return `<pre ${stringifyAttributes({
          lang: attrs?.lang
        })}><code>${content}</code></pre>`;
      case "embed":
        return `<iframe ${stringifyAttributes({
          "src": attrs?.src,
          "data-type": attrs?.embed
        })}></iframe>`;
      case "bulletList":
        return `<ul>${content}</ul>`;
      case "orderedList":
        return `<ol>${content}</ol>`;
      case "taskList":
        return `<ul data-type="taskList">${content}</ul>`;
      case "taskItem":
        return `<li data-type="taskItem"><label><input ${stringifyAttributes({
          type: "checkbox",
          checked: attrs?.checked
        })}/></label><div>${content}</div></li>`;
      case "listItem":
        return `<li>${content}</li>`;
      case "horizontalRule":
        return `<hr/>`;
      case "table":
        return `<table>${content}</table>`;
      case "tableRow":
        return `<tr>${content}</tr>`;
      case "tableCell":
        return `<td>${content.replace(/<p>((?:.|\n)*)<\/p>/g, "$1")}</td>`;
      case "tableHeader":
        return `<th>${content.replace(/<p>((?:.|\n)*)<\/p>/g, "$1")}</th>`;
      default:
        return content;
    }
  }
});

export { htmlTransformer };
