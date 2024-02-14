import { toHtml } from "hast-util-to-html";
import { rehype } from "rehype";
import { CONTINUE, SKIP, visit } from "unist-util-visit";
import type { Element } from "hast";

interface RequestExample {
  label: string;
  html: string;
}
interface ResponseExample {
  html: string;
}
declare module "vfile" {
  interface DataMap {
    requestExamples: RequestExample[];
    responseExample: ResponseExample | null;
  }
}

const tabsProcessor = rehype()
  .data("settings", { fragment: true })
  .use(() => {
    return (tree: Element, file) => {
      file.data.requestExamples = [];
      file.data.responseExample = null;
      visit(tree, "element", (node) => {
        if (node.tagName !== "request-example" && node.tagName !== "response-example") {
          return CONTINUE;
        }

        if (node.tagName === "request-example") {
          file.data.requestExamples = file.data.requestExamples || [];
          file.data.requestExamples.push({
            label: `${node.properties.label || ""}`,
            html: toHtml(node.children)
          });
        }

        if (node.tagName === "response-example") {
          file.data.responseExample = {
            html: toHtml(node.children)
          };
        }

        return SKIP;
      });
    };
  });
const processExamples = (
  html: string
): { requestExamples: RequestExample[]; responseExample: ResponseExample | null } => {
  const file = tabsProcessor.processSync({ value: html });

  return {
    requestExamples: file.data.requestExamples || [],
    responseExample: file.data.responseExample || null
  };
};

export { processExamples };
export type { RequestExample, ResponseExample };
