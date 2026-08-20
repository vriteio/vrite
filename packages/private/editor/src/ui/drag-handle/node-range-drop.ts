import { isNodeRangeSelection, NodeRangeSelection } from "@tiptap/extension-node-range";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Selection, Transaction } from "@tiptap/pm/state";

interface ActiveDragRange {
  anchorPos: number;
  depth: number;
  nodeCount: number;
  relativeAnchorPos?: unknown;
}
interface RestorePositionOptions {
  getAbsolutePos(relativePos: unknown): number;
  isChangeOrigin: boolean;
}

const getActiveDragRange = (selection: Selection): ActiveDragRange | null => {
  if (!isNodeRangeSelection(selection)) return null;

  return {
    anchorPos: selection.from,
    depth: selection.depth ?? 0,
    nodeCount: selection.ranges.length
  };
};
const mapRestorePosition = (
  range: ActiveDragRange,
  transaction: Transaction,
  options: RestorePositionOptions
): ActiveDragRange | null => {
  if (!transaction.docChanged) return range;

  if (options.isChangeOrigin && range.relativeAnchorPos !== undefined) {
    const anchorPos = options.getAbsolutePos(range.relativeAnchorPos);

    return Number.isFinite(anchorPos) && anchorPos > 0 ? { ...range, anchorPos } : null;
  }

  const mapped = transaction.mapping.mapResult(range.anchorPos, 1);

  return mapped.deleted ? null : { ...range, anchorPos: mapped.pos };
};
const sumNodeSizes = (parent: ProseMirrorNode, from: number, to: number): number => {
  let size = 0;

  for (let index = from; index < to; index += 1) size += parent.child(index).nodeSize;

  return size;
};
const createDroppedSelection = (
  doc: ProseMirrorNode,
  range: ActiveDragRange
): NodeRangeSelection | null => {
  try {
    const $pos = doc.resolve(range.anchorPos);
    const parent = $pos.node(range.depth);
    let index = $pos.index(range.depth);

    if (index >= parent.childCount) index = Math.max(0, parent.childCount - range.nodeCount);

    const nodeCount = Math.min(range.nodeCount, parent.childCount - index);

    if (nodeCount <= 0) return null;

    const from = $pos.start(range.depth) + sumNodeSizes(parent, 0, index);
    const to = from + sumNodeSizes(parent, index, index + nodeCount);
    const selection = NodeRangeSelection.create(doc, from, to, range.depth);

    return selection.ranges.length === range.nodeCount ? selection : null;
  } catch {
    return null;
  }
};

export { createDroppedSelection, getActiveDragRange, mapRestorePosition };
export type { ActiveDragRange };
