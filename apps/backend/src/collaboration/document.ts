import { hashContentDocument, serializeContentDocument } from "#backend/lib/content";
import { MAX_CONTENT_NAME_LENGTH } from "#backend/lib/validation";
import { type Doc, XmlElement, XmlText } from "yjs";
import type { ContentSnapshot } from "./types";

const getDocumentTitle = (document: Doc): string | null => {
  const titleElement = document
    .getXmlFragment("default")
    .toArray()
    .find((node): node is XmlElement => {
      return node instanceof XmlElement && node.nodeName === "title";
    });
  const title =
    titleElement
      ?.toArray()
      .filter((node): node is XmlText => node instanceof XmlText)
      .map((node) => node.toString())
      .join("")
      .trim() || "";

  if (title.length > MAX_CONTENT_NAME_LENGTH) return null;

  return title || "Untitled";
};
const getContentSnapshot = (document: Doc): ContentSnapshot => {
  const content = serializeContentDocument(document);

  return {
    document: content,
    hash: hashContentDocument(content)
  };
};
const setDocumentTitle = (document: Doc, title: string): void => {
  const fragment = document.getXmlFragment("default");
  let titleElement = fragment.toArray().find((node): node is XmlElement => {
    return node instanceof XmlElement && node.nodeName === "title";
  });

  if (!titleElement) {
    titleElement = new XmlElement("title");
    fragment.insert(0, [titleElement]);
  }

  const hasContentBlock = fragment
    .toArray()
    .some((node) => node instanceof XmlElement && node.nodeName !== "title");

  if (!hasContentBlock) fragment.push([new XmlElement("paragraph")]);

  const currentTitle = titleElement
    .toArray()
    .filter((node): node is XmlText => node instanceof XmlText)
    .map((node) => node.toString())
    .join("");

  if (currentTitle === title) return;

  if (titleElement.length > 0) titleElement.delete(0, titleElement.length);

  if (title) titleElement.insert(0, [new XmlText(title)]);
};

export { getContentSnapshot, getDocumentTitle, setDocumentTitle };
