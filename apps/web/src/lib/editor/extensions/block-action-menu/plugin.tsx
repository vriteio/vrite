import { Extension, Range } from "@tiptap/core";
import { BlockActionMenu } from "./component";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { TextSelection } from "@tiptap/pm/state";
import { ResolvedPos, Node as PMNode } from "@tiptap/pm/model";

const box = document.createElement("div");

let component: SolidRenderer<{
  editor: SolidEditor;
  node: PMNode | null;
  range: Range | null;
}> | null = null;

const findParentAtDepth = ($pos: ResolvedPos, depth: number) => {
  const node = $pos.node(depth);
  return {
    pos: depth > 0 ? $pos.before(depth) : 0,
    start: $pos.start(depth),
    depth: depth,
    node
  };
};
const getBlockParent = (node: Node): HTMLElement | null => {
  let currentNode: HTMLElement | null =
    node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;

  while (currentNode) {
    if (currentNode.parentElement?.classList.contains("ProseMirror")) {
      return currentNode;
    }

    currentNode = currentNode.parentElement;
  }

  return null;
};
const BlockActionMenuPlugin = Extension.create({
  name: "blockActionMenu",
  onCreate() {
    component = new SolidRenderer(BlockActionMenu, {
      editor: this.editor as SolidEditor,
      state: {
        editor: this.editor as SolidEditor,
        node: null as PMNode | null,
        range: null as Range | null
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
    const { selection } = this.editor.state;
    const isTextSelection = selection instanceof TextSelection;
    const selectedNode = selection.$from.node(1) || selection.$from.nodeAfter;

    if (!selectedNode) {
      box.style.display = "none";
      return;
    }

    const { view } = this.editor;
    const node =
      view.nodeDOM(selection.$from.pos) ||
      view.nodeDOM(selection.$from.pos - selection.$from.parentOffset) ||
      view.domAtPos(selection.$from.pos)?.node;

    if (!node) return;

    const blockParent = getBlockParent(node);
    const parentPos = document.getElementById("pm-container")?.getBoundingClientRect();
    const childPos = blockParent?.getBoundingClientRect();

    if (!parentPos || !childPos) return;

    const relativePos = {
      top: childPos.top - parentPos.top,
      right: childPos.right - parentPos.right,
      bottom: childPos.bottom - parentPos.bottom,
      left: childPos.left - parentPos.left
    };

    let rangeFrom = selection.$from.pos;
    let rangeTo = selection.$to.pos;

    box.style.top = `${relativePos.top}px`;
    box.style.left = `${relativePos.left + parentPos.width}px`;
    box.style.display = "block";

    if (isTextSelection) {
      try {
        const p = findParentAtDepth(selection.$from, 1);
        rangeFrom = p.start - 1;
        rangeTo = p.start + p.node.nodeSize - 1;
      } catch (e) {
        box.style.display = "none";
      }
    }

    component?.setState({
      range: {
        from: rangeFrom,
        to: rangeTo
      },
      node: selectedNode,
      editor: this.editor as SolidEditor
    });
  }
});

export { BlockActionMenuPlugin };
