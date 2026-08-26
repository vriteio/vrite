import type { JSONContent } from "@tiptap/core";

const CONTENT_IDENTITY_BLOCKS = new Set([
  "blockquote",
  "bulletList",
  "heading",
  "listItem",
  "orderedList",
  "paragraph",
  "taskItem",
  "taskList"
]);

const getUserFacingAttributes = (node: JSONContent) => {
  const { id: _, ...attributes } = node.attrs ?? {};

  return attributes;
};
const getUserFacingAttributeIdentity = (node: JSONContent) => {
  return JSON.stringify(getUserFacingAttributes(node));
};
const getComparableNode = (node: JSONContent): JSONContent => {
  return {
    type: node.type,
    attrs: getUserFacingAttributes(node),
    content: node.content?.map(getComparableNode) ?? [],
    marks: node.marks ?? [],
    text: node.text
  };
};
const getComparableIdentity = (node: JSONContent): string => {
  return JSON.stringify(getComparableNode(node));
};
const getContentIdentity = (node: JSONContent) => {
  return JSON.stringify(node.content?.map(getComparableNode) ?? []);
};
const getAttributeIdentity = (node: JSONContent, names: string[]) => {
  return JSON.stringify(Object.fromEntries(names.map((name) => [name, node.attrs?.[name]])));
};
const getBlockFallbackIdentity = (node: JSONContent) => {
  const name = node.type ?? "";
  let identity: string;

  if (CONTENT_IDENTITY_BLOCKS.has(name)) {
    identity = getContentIdentity(node);
  } else if (name === "fragment") {
    identity = getAttributeIdentity(node, ["name"]);
  } else if (name === "property") {
    identity = getAttributeIdentity(node, ["label", "type"]);
  } else if (name === "horizontalRule" || name === "title") {
    identity = name;
  } else {
    identity = getComparableIdentity(node);
  }

  return `${name}:${identity}`;
};
export { getBlockFallbackIdentity, getComparableIdentity, getUserFacingAttributeIdentity };
