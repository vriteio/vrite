import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { STRUCTURE_NODE_TYPES } from "./constants";

interface SelectedBlockVisitor {
  (node: ProseMirrorNode, pos: number): boolean | void;
}

const isEditorBlock = (node: ProseMirrorNode): boolean => {
  return node.type.isInGroup("block") || STRUCTURE_NODE_TYPES.has(node.type.name);
};
const selectionCoversNode = (
  node: ProseMirrorNode,
  pos: number,
  from: number,
  to: number
): boolean => {
  if (node.isLeaf) {
    return from <= pos && to >= pos + node.nodeSize;
  }

  return from <= pos + 1 && to >= pos + node.nodeSize - 1;
};
const forEachSelectedBlock = (
  doc: ProseMirrorNode,
  from: number,
  to: number,
  visitor: SelectedBlockVisitor
): void => {
  let stopped = false;

  doc.nodesBetween(from, to, (node, pos, parent) => {
    if (stopped) return false;

    const selectable = node.type.name === "title" || isEditorBlock(node);

    if (!selectable) return true;
    if (node.type.name === "fragment" && !selectionCoversNode(node, pos, from, to)) return true;
    if (parent !== doc && parent?.type.name !== "fragment") return false;

    if (visitor(node, pos) === false) stopped = true;

    return false;
  });
};

export { forEachSelectedBlock, isEditorBlock, selectionCoversNode };
