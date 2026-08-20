import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { DecorationSet, type EditorView } from "@tiptap/pm/view";
import { addSplitDecoration, createBaseDecorations } from "./decorations";
import {
  getDragDropPoint,
  isPointerInFragmentSplit,
  type DragCoordinates
} from "./fragment-drop-boundary";
import { getActiveFragmentSplitPos, separatorPluginKey, type SeparatorState } from "./plugin-state";

const getFragmentSplitPos = (
  view: EditorView,
  coordinates: DragCoordinates,
  currentSplitPos: number | null
): number | null => {
  if (currentSplitPos !== null && isPointerInFragmentSplit(view, currentSplitPos, coordinates.y)) {
    return currentSplitPos;
  }

  const position = view.posAtCoords({ left: coordinates.x, top: coordinates.y });

  if (!position) return null;

  const target = getDragDropPoint(view, position.pos);
  const $target = view.state.doc.resolve(target);
  const isBetweenFragments =
    $target.depth === 0 &&
    $target.nodeBefore?.type.name === "fragment" &&
    $target.nodeAfter?.type.name === "fragment";

  return isBetweenFragments ? target : null;
};
const Separator = Extension.create({
  name: "separator",
  addProseMirrorPlugins() {
    let dragFrame: number | null = null;
    let pendingCoordinates: DragCoordinates | null = null;

    const cancelPendingDrag = () => {
      if (dragFrame !== null) cancelAnimationFrame(dragFrame);

      dragFrame = null;
      pendingCoordinates = null;
    };

    return [
      new Plugin<SeparatorState>({
        key: separatorPluginKey,
        state: {
          init(_, state) {
            const baseDecorations = createBaseDecorations(state.doc);

            return {
              baseDecorations,
              decorations: baseDecorations,
              splitPos: null
            };
          },
          apply(transaction, value, _oldState, state) {
            const splitPosMeta = transaction.getMeta(separatorPluginKey) as
              number | null | undefined;
            const baseDecorations = transaction.docChanged
              ? createBaseDecorations(state.doc)
              : value.baseDecorations;

            let splitPos = transaction.docChanged ? null : value.splitPos;

            if (splitPosMeta !== undefined) splitPos = splitPosMeta;

            if (!transaction.docChanged && splitPos === value.splitPos) return value;

            return {
              baseDecorations,
              decorations: addSplitDecoration(state.doc, baseDecorations, splitPos),
              splitPos
            };
          }
        },
        props: {
          decorations(state) {
            return separatorPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
          },
          handleDOMEvents: {
            dragover(view, event) {
              pendingCoordinates = { x: event.clientX, y: event.clientY };

              if (dragFrame !== null) return false;

              dragFrame = requestAnimationFrame(() => {
                const coordinates = pendingCoordinates;

                dragFrame = null;
                pendingCoordinates = null;
                if (!coordinates) return;

                const currentSplitPos = getActiveFragmentSplitPos(view.state);
                const splitPos = getFragmentSplitPos(view, coordinates, currentSplitPos);

                if (splitPos !== currentSplitPos) {
                  view.dispatch(view.state.tr.setMeta(separatorPluginKey, splitPos));
                }
              });

              return false;
            }
          }
        },
        view(view) {
          const clearSplit = () => {
            cancelPendingDrag();

            if (getActiveFragmentSplitPos(view.state) !== null) {
              view.dispatch(view.state.tr.setMeta(separatorPluginKey, null));
            }
          };

          document.addEventListener("dragend", clearSplit);
          document.addEventListener("drop", clearSplit);

          return {
            destroy() {
              cancelPendingDrag();
              document.removeEventListener("dragend", clearSplit);
              document.removeEventListener("drop", clearSplit);
            }
          };
        }
      })
    ];
  }
});

export { Separator };
