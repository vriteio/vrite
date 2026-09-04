import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { STRUCTURE_NODE_TYPES } from "./constants";

interface SelectedBlockVisitor {
  (node: ProseMirrorNode, pos: number): boolean | void;
}
interface SelectedBlockOptions {
  includeCoveredFragments?: boolean;
}

const isEditorBlock = (node: ProseMirrorNode): boolean => {
  return node.type.isInGroup("block") || STRUCTURE_NODE_TYPES.has(node.type.name);
};
const isPositionInInheritedField = (doc: ProseMirrorNode, pos: number): boolean => {
  const resolvedPosition = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));

  if (doc.nodeAt(pos)?.attrs.inherited) return true;

  for (let depth = resolvedPosition.depth; depth > 0; depth -= 1) {
    if (resolvedPosition.node(depth).attrs.inherited) return true;
  }

  return false;
};
const rangeContainsInheritedField = (doc: ProseMirrorNode, from: number, to: number): boolean => {
  let inherited = false;

  doc.nodesBetween(from, to, (node) => {
    if (node.attrs.inherited) {
      inherited = true;
      return false;
    }

    return !inherited;
  });

  return inherited;
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
  visitor: SelectedBlockVisitor,
  options: SelectedBlockOptions = {}
): void => {
  const { includeCoveredFragments = true } = options;

  let stopped = false;

  doc.nodesBetween(from, to, (node, pos, parent) => {
    if (stopped) return false;

    const selectable = node.type.name === "title" || isEditorBlock(node);

    if (!selectable) return true;
    if (
      node.type.name === "fragment" &&
      (!includeCoveredFragments || !selectionCoversNode(node, pos, from, to))
    ) {
      return true;
    }
    if (parent !== doc && parent?.type.name !== "fragment") return false;

    if (visitor(node, pos) === false) stopped = true;

    return false;
  });
};

export {
  forEachSelectedBlock,
  isEditorBlock,
  isPositionInInheritedField,
  rangeContainsInheritedField,
  selectionCoversNode
};
