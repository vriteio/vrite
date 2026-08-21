import { type Doc, XmlElement, XmlText } from "yjs";
import type { ContentMark, ContentNode } from "./document";

const getMarkAttributes = (marks?: ContentMark[]): Record<string, unknown> => {
  return Object.fromEntries((marks || []).map((mark) => [mark.type, mark.attrs || {}]));
};
const createTextNode = (nodes: ContentNode[]): XmlText => {
  const text = new XmlText();

  text.applyDelta(
    nodes.map((node) => ({
      insert: node.text || "",
      attributes: getMarkAttributes(node.marks)
    }))
  );

  return text;
};
const createYNodes = (nodes: ContentNode[]): Array<XmlElement | XmlText> => {
  const yNodes: Array<XmlElement | XmlText> = [];

  let textNodes: ContentNode[] = [];

  const appendText = () => {
    if (textNodes.length === 0) return;

    yNodes.push(createTextNode(textNodes));
    textNodes = [];
  };

  for (const node of nodes) {
    if (node.type === "text") {
      textNodes.push(node);
      continue;
    }

    appendText();

    const element = new XmlElement(node.type);

    for (const [name, value] of Object.entries(node.attrs || {})) {
      if (value !== null && value !== undefined) element.setAttribute(name, value as string);
    }

    const children = createYNodes(node.content || []);

    if (children.length > 0) element.insert(0, children);

    yNodes.push(element);
  }

  appendText();

  return yNodes;
};
const replaceContentDocument = (document: Doc, content: ContentNode): void => {
  const fragment = document.getXmlFragment("default");
  const nodes = createYNodes(content.content || []);

  if (fragment.length > 0) fragment.delete(0, fragment.length);

  if (nodes.length > 0) fragment.insert(0, nodes);
};

export { replaceContentDocument };
