import { CustomNodeMenu } from "./component";
import { isElementSelection } from "../element/selection";
import { Extension } from "@tiptap/core";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { breakpoints } from "#lib/utils";

const generalMenuContainer = document.createElement("div");

let generalMenu: SolidRenderer<{
  editor: SolidEditor;
  container: HTMLElement | null;
}> | null = null;

const getTableParent = (node: Node): HTMLElement | null => {
  let currentNode: HTMLElement | null =
    node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;

  while (currentNode) {
    if (currentNode.getAttribute("data-custom-node-view")) {
      return currentNode;
    }

    currentNode = currentNode.parentElement;
  }

  return null;
};
const handleUpdate = (editor: SolidEditor): void => {
  const { selection } = editor.state;
  const selectedNode = selection.$from.node(1) || selection.$from.nodeAfter;

  if (!selectedNode || !editor.isActive("element") || isElementSelection(selection)) {
    generalMenuContainer.style.display = "none";

    return;
  }

  const { view } = editor;
  const node =
    view.nodeDOM(selection.$from.pos) ||
    view.nodeDOM(selection.$from.pos - selection.$from.parentOffset) ||
    view.domAtPos(selection.$from.pos)?.node;

  if (!node) return;

  const blockParent = getTableParent(node);
  const parentPos = document.getElementById("pm-container")?.getBoundingClientRect();
  const childPos = blockParent?.getBoundingClientRect();
  const tablePos = blockParent?.getBoundingClientRect();

  if (!parentPos || !childPos) return;

  const relativePos = {
    top: childPos.top - parentPos.top,
    right: childPos.right - parentPos.right,
    bottom: childPos.bottom - parentPos.bottom,
    left: childPos.left - parentPos.left
  };

  generalMenuContainer.style.top = `${relativePos.top + (tablePos?.height || 0)}px`;
  generalMenuContainer.style.transform = `translate(${
    (tablePos?.width || 0) > 250 ? "-50%" : "0"
  },0.75rem)`;

  if ((tablePos?.width || 0) > 250 && breakpoints.md()) {
    generalMenuContainer.style.left = `${
      relativePos.left + Math.min(tablePos?.width || parentPos.width, parentPos.width) / 2
    }px`;
  } else if (breakpoints.md()) {
    generalMenuContainer.style.left = "0";
  } else {
    generalMenuContainer.style.left = "-0.25rem";
  }

  generalMenuContainer.style.display = "block";
  generalMenu?.setState({
    node: selectedNode,
    container: blockParent,
    editor
  });
};
const CustomNodeMenuPlugin = Extension.create({
  name: "customNodeMenu",
  onCreate() {
    generalMenu = new SolidRenderer(CustomNodeMenu, {
      editor: this.editor as SolidEditor,
      state: {
        container: null as HTMLElement | null,
        editor: this.editor as SolidEditor
      }
    });
    generalMenuContainer.style.position = "absolute";
    generalMenuContainer.style.top = "-100vh";
    generalMenuContainer.style.left = "-100vw";
    generalMenuContainer.appendChild(generalMenu.element);
    document.getElementById("pm-container")?.appendChild(generalMenuContainer);
  },
  onBlur() {
    const dropdownOpened = document.documentElement.classList.contains("dropdown-opened");

    if (
      (document.activeElement?.contains(generalMenuContainer) || dropdownOpened) &&
      breakpoints.md()
    ) {
      return;
    }

    generalMenuContainer.style.display = "none";
  },
  onFocus() {
    if (this.editor.isActive("element") && !isElementSelection(this.editor.state.selection)) {
      generalMenuContainer.style.display = "block";
    }
  },
  onUpdate() {
    handleUpdate(this.editor as SolidEditor);
  },
  onSelectionUpdate() {
    handleUpdate(this.editor as SolidEditor);
  }
});

export { CustomNodeMenuPlugin };
