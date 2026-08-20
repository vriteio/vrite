import { isChangeOrigin } from "@tiptap/extension-collaboration";
import { dragHandlePluginDefaultKey } from "@tiptap/extension-drag-handle";
import type { Editor } from "@tiptap/core";
import { Plugin, type EditorState, type Transaction } from "@tiptap/pm/state";
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey
} from "@tiptap/y-tiptap";
import { dragTarget, type DragTarget } from "./drag-handler";
import {
  createDroppedSelection,
  getActiveDragRange,
  mapRestorePosition,
  type ActiveDragRange
} from "./node-range-drop";

interface DragHandlePluginOptions {
  editor: Editor;
  element: HTMLElement;
  getDragTarget(): DragTarget | null;
  onDragEnd?(event: DragEvent): void;
  onDragStart?(event: DragEvent): void;
}

const dragHandlePluginKey = dragHandlePluginDefaultKey;
const getRelativePos = (state: EditorState, pos: number): unknown => {
  const yState = ySyncPluginKey.getState(state);

  return yState
    ? absolutePositionToRelativePosition(pos, yState.type, yState.binding.mapping)
    : undefined;
};
const getAbsolutePos = (state: EditorState, relativePos: unknown): number => {
  const yState = ySyncPluginKey.getState(state);

  if (!yState) return -1;

  return (
    relativePositionToAbsolutePosition(
      yState.doc,
      yState.type,
      relativePos,
      yState.binding.mapping
    ) ?? -1
  );
};
const createDragHandlePlugin = (options: DragHandlePluginOptions) => {
  const { editor, element } = options;
  const wrapper = document.createElement("div");
  let activeDragRange: ActiveDragRange | null = null;
  let pendingRestore: ActiveDragRange | null = null;
  let locked = false;
  const hide = () => {
    element.style.visibility = "hidden";
    element.style.pointerEvents = "none";
  };
  const handleDragStart = (event: DragEvent) => {
    const target = options.getDragTarget();

    if (!target || !event.dataTransfer) {
      event.preventDefault();
      return;
    }

    element.dataset.dragging = "true";
    options.onDragStart?.(event);

    if (!dragTarget(event, editor, target)) {
      handleDragEnd(event);
      event.preventDefault();
      return;
    }

    activeDragRange = getActiveDragRange(editor.state.selection);

    setTimeout(() => {
      element.style.pointerEvents = "none";
    });
  };
  const handleDragEnd = (event: DragEvent) => {
    activeDragRange = null;
    element.dataset.dragging = "false";
    element.style.pointerEvents = "auto";
    hide();
    options.onDragEnd?.(event);
  };
  const handleDrop = (event: DragEvent) => {
    if (
      !activeDragRange ||
      editor.state.selection.empty ||
      !event.target ||
      !editor.view.dom.contains(event.target as Node)
    ) {
      return;
    }

    const anchorPos = editor.state.selection.from;

    pendingRestore = {
      ...activeDragRange,
      anchorPos,
      relativeAnchorPos: getRelativePos(editor.state, anchorPos)
    };
    editor.view.dispatch(editor.state.tr.setMeta("addToHistory", false));
  };
  const cleanup = () => {
    element.removeEventListener("dragstart", handleDragStart);
    element.removeEventListener("dragend", handleDragEnd);
    document.removeEventListener("drop", handleDrop);
  };
  const plugin = new Plugin({
    key: dragHandlePluginKey,
    state: {
      init: () => null,
      apply(transaction, _pluginState, _oldState, state) {
        const lock = transaction.getMeta("lockDragHandle");

        if (lock !== undefined) locked = Boolean(lock);
        if (transaction.getMeta("hideDragHandle")) hide();

        if (pendingRestore) {
          pendingRestore = mapRestorePosition(pendingRestore, transaction, {
            getAbsolutePos: (relativePos) => getAbsolutePos(state, relativePos),
            isChangeOrigin: isChangeOrigin(transaction)
          });
        }

        return null;
      }
    },
    appendTransaction(_transactions: readonly Transaction[], _oldState, newState) {
      if (!pendingRestore) return null;

      const selection = createDroppedSelection(newState.doc, pendingRestore);

      pendingRestore = null;
      activeDragRange = null;

      return selection ? newState.tr.setSelection(selection) : null;
    },
    view() {
      element.draggable = true;
      element.dataset.dragging = "false";
      element.style.pointerEvents = "auto";
      wrapper.style.pointerEvents = "none";
      wrapper.style.position = "absolute";
      wrapper.style.left = "0";
      wrapper.style.top = "0";
      wrapper.append(element);
      editor.view.dom.parentElement?.append(wrapper);
      element.addEventListener("dragstart", handleDragStart);
      element.addEventListener("dragend", handleDragEnd);
      document.addEventListener("drop", handleDrop);

      return {
        update() {
          element.draggable = editor.isEditable && !locked;

          if (!editor.isEditable) hide();
        },
        destroy() {
          cleanup();
          wrapper.remove();
        }
      };
    }
  });

  return { plugin, unbind: cleanup };
};

export { createDragHandlePlugin, dragHandlePluginKey };
