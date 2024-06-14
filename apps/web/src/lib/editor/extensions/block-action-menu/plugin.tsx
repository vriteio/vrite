import { BlockActionMenu } from "./component";
import { Extension, Range } from "@tiptap/core";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { ResolvedPos, Node as PMNode } from "@tiptap/pm/model";
import { debounce } from "@solid-primitives/scheduled";

const box = document.createElement("div");

let component: SolidRenderer<{
  editor: SolidEditor;
  node: PMNode | null;
  range: Range | null;
  pos: number | null;
  repositionMenu: () => void;
}> | null = null;

const findParentAtDepth = (
  $pos: ResolvedPos,
  depth: number
): { pos: number; start: number; depth: number; node: PMNode } => {
  const node = $pos.node(depth);

  return {
    pos: depth > 0 ? $pos.before(depth) : 0,
    start: $pos.start(depth),
    depth,
    node
  };
};
const repositionMenu = (editor: SolidEditor): void => {
  const { selection } = editor.state;
  const isTextSelection = selection instanceof TextSelection;
  const isNodeSelection = selection instanceof NodeSelection;
  const selectedNode = isNodeSelection ? selection.node : selection.$from.parent;
  const selectedPos = selection.$from.pos - (isNodeSelection ? 0 : selection.$from.parentOffset);

  if (!selectedNode) {
    box.style.display = "none";

    return;
  }

  const { view } = editor;
  const node =
    view.nodeDOM(selection.$from.pos) ||
    view.nodeDOM(selection.$from.pos - selection.$from.parentOffset) ||
    view.domAtPos(selection.$from.pos)?.node;

  if (!node) return;

  const blockParent = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
  const parentPos = document.getElementById("pm-container")?.getBoundingClientRect();
  const childPos = blockParent?.getBoundingClientRect();

  if (!parentPos || !childPos) return;

  const relativePos = {
    top: childPos.top - parentPos.top,
    right: childPos.right - parentPos.right,
    bottom: childPos.bottom - parentPos.bottom,
    left: 0
  };

  let rangeFrom = selection.$from.pos;
  let rangeTo = selection.$to.pos;

  box.style.top = `${relativePos.top}px`;
  box.style.left = `${relativePos.left + parentPos.width}px`;
  box.style.display = "block";

  if (isTextSelection) {
    try {
      const p = findParentAtDepth(selection.$from, selection.$from.depth);

      rangeFrom = Math.max(p.start - 1, 0);
      rangeTo = Math.min(p.start + p.node.nodeSize - 1, editor.state.doc.nodeSize - 2);
    } catch (error) {
      box.style.display = "none";
    }
  }

  component?.setState({
    range: {
      from: rangeFrom,
      to: rangeTo
    },
    node: selectedNode,
    pos: selectedPos,
    editor,
    repositionMenu: component.state().repositionMenu || (() => {})
  });
};
const BlockActionMenuPlugin = Extension.create({
  name: "blockActionMenu",
  onCreate() {
    const debouncedRepositionMenu = debounce(() => {
      if (this.editor.isDestroyed) return;

      repositionMenu(this.editor as SolidEditor);
    }, 250);

    component = new SolidRenderer(BlockActionMenu, {
      editor: this.editor as SolidEditor,
      state: {
        editor: this.editor as SolidEditor,
        node: null as PMNode | null,
        range: null as Range | null,
        pos: null as number | null,
        repositionMenu: () => {
          box.style.display = "none";
          debouncedRepositionMenu();
        }
      }
    });
    box.style.position = "absolute";
    box.style.top = "-100vh";
    box.style.left = "-100vw";
    box.appendChild(component.element);
    document.getElementById("pm-container")?.appendChild(box);
  },
  onBlur() {
    const dropdownOpened = document.documentElement.classList.contains("dropdown-opened");

    if (document.activeElement?.contains(box) || dropdownOpened) return;

    box.style.display = "none";
  },
  onFocus() {
    box.style.display = "block";
  },
  onSelectionUpdate() {
    repositionMenu(this.editor as SolidEditor);
  }
});

export { BlockActionMenuPlugin };
