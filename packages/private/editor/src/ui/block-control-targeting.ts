import { isBlockSelection } from "#editor/extensions/block-selection";
import type { Editor } from "@tiptap/core";
import { LIST_ITEM_TYPES } from "./constants";
import {
  getBlockContentRect,
  getBlockControlAnchorRect,
  getCachedElementRect,
  getEditorScrollContainer,
  isPointInBlockControlArea,
  type BlockControlTarget
} from "./block-control-sizing";

interface BlockControlRange {
  from: number;
  to: number;
}

const getBlockControlTargetAtPos = (editor: Editor, pos: number): BlockControlTarget | null => {
  if (pos < 0) return null;

  const node = editor.state.doc.nodeAt(pos);
  const dom = node ? editor.view.nodeDOM(pos) : null;

  return node && node.type.name !== "title" && dom instanceof HTMLElement
    ? { dom, node, pos }
    : null;
};

const getBlockSelectionTopTarget = (editor: Editor): BlockControlTarget | null => {
  const { doc, selection } = editor.state;

  if (!isBlockSelection(selection)) return null;

  let target: BlockControlTarget | null = null;

  doc.nodesBetween(selection.from, selection.to, (node, pos, parent) => {
    if (target || parent !== doc) return false;
    if (!node.type.isInGroup("block")) return true;

    target = getBlockControlTargetAtPos(editor, pos);
    return !target;
  });

  return target;
};

const isTargetInBlockSelection = (editor: Editor, target: BlockControlTarget): boolean => {
  const { selection } = editor.state;

  return (
    isBlockSelection(selection) &&
    target.pos < selection.to &&
    target.pos + target.node.nodeSize > selection.from
  );
};

const registerSelectionControlHiding = (editor: Editor, hideControls: () => void): (() => void) => {
  const element = editor.view.dom;

  let keyboardInput = false;

  const setKeyboardInput = () => (keyboardInput = true);
  const clearKeyboardInput = () => (keyboardInput = false);
  const handleSelectionUpdate = () => {
    // Ranges and keyboard-driven caret moves hide controls; pointer caret moves do not.
    const shouldHide = !editor.state.selection.empty || keyboardInput;

    keyboardInput = false;
    if (shouldHide) hideControls();
  };

  element.addEventListener("keydown", setKeyboardInput, true);
  element.addEventListener("keyup", clearKeyboardInput, true);
  element.addEventListener("blur", clearKeyboardInput, true);
  element.addEventListener("pointerdown", clearKeyboardInput, true);
  editor.on("selectionUpdate", handleSelectionUpdate);

  return () => {
    element.removeEventListener("keydown", setKeyboardInput, true);
    element.removeEventListener("keyup", clearKeyboardInput, true);
    element.removeEventListener("blur", clearKeyboardInput, true);
    element.removeEventListener("pointerdown", clearKeyboardInput, true);
    editor.off("selectionUpdate", handleSelectionUpdate);
  };
};

const getBlockControlTargetAtY = (
  editor: Editor,
  y: number,
  { listItemSpecific = true }: { listItemSpecific?: boolean } = {}
): BlockControlTarget | null => {
  const { state, view } = editor;
  const editorRect = getCachedElementRect(editor, view.dom);
  const position = view.posAtCoords({ left: editorRect.x + editorRect.width / 2, top: y });

  if (!position) return null;

  const $pos = state.doc.resolve(position.pos);

  if (!listItemSpecific) {
    const pos = $pos.depth ? $pos.before(1) : position.inside >= 0 ? position.inside : $pos.pos;

    return getBlockControlTargetAtPos(editor, pos);
  }

  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if (LIST_ITEM_TYPES.has($pos.node(depth).type.name)) {
      return getBlockControlTargetAtPos(editor, $pos.before(depth));
    }
  }

  for (const pos of [position.inside, $pos.depth ? $pos.before(1) : -1, $pos.pos]) {
    const target = getBlockControlTargetAtPos(editor, pos);

    if (target) return target;
  }

  return null;
};

export {
  getBlockContentRect,
  getBlockControlAnchorRect,
  getBlockSelectionTopTarget,
  getBlockControlTargetAtY,
  getCachedElementRect,
  getEditorScrollContainer,
  isPointInBlockControlArea,
  isTargetInBlockSelection,
  registerSelectionControlHiding
};
export type { BlockControlTarget, BlockControlRange };
