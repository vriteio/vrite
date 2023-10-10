import { ElementMenu } from "./component";
import { Extension } from "@tiptap/core";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { CellSelection } from "@tiptap/pm/tables";
import { createNanoEvents } from "nanoevents";
import { NodeSelection } from "@tiptap/pm/state";
import { Node as PMNode } from "@tiptap/pm/model";

const emitter = createNanoEvents();
const generalMenuContainer = document.createElement("div");

let generalMenu: SolidRenderer<{
  editor: SolidEditor;
  pos: number;
  node: PMNode | null;
  container: HTMLElement | null;
  active: boolean;
}> | null = null;

const handleUpdate = (editor: SolidEditor): void => {
  const { selection } = editor.state;
  const selectedNode = selection.$from.nodeAfter;
  const isNodeSelection = selection instanceof NodeSelection;

  if (!isNodeSelection || !selectedNode || selectedNode.type.name !== "element") {
    generalMenuContainer.style.display = "none";
    generalMenu?.setState((state) => ({ ...state, active: false }));

    return;
  }

  const { view } = editor;
  const node = view.nodeDOM(selection.$from.pos);

  if (!node) return;

  const blockParent = node as HTMLElement;
  const parentPos = document.getElementById("pm-container")?.getBoundingClientRect();
  const childPos = blockParent?.getBoundingClientRect();

  if (!parentPos || !childPos) return;

  const relativePos = {
    top: childPos.top - parentPos.top,
    right: childPos.right - parentPos.right,
    bottom: childPos.bottom - parentPos.bottom,
    left: childPos.left - parentPos.left
  };

  Object.assign(generalMenuContainer.style, {
    width: `${Math.min(childPos?.width || parentPos.width, parentPos.width)}px`,
    top: `${relativePos.top}px`,
    left: `${relativePos.left}px`,
    position: "absolute",
    display: "block"
  });
  generalMenu?.setState(() => ({
    pos: selection.$from.pos,
    node: selectedNode,
    container: blockParent,
    editor,
    active: true
  }));
};
const ElementMenuPlugin = Extension.create({
  name: "elementMenu",
  onCreate() {
    generalMenu = new SolidRenderer(ElementMenu, {
      editor: this.editor as SolidEditor,
      state: {
        pos: 0,
        node: null as PMNode | null,
        container: null as HTMLElement | null,
        editor: this.editor as SolidEditor,
        active: false as boolean
      }
    });
    generalMenuContainer.appendChild(generalMenu.element);
    document.getElementById("pm-container")?.appendChild(generalMenuContainer);
  },
  onBlur() {
    const menuActive = document.activeElement?.contains(generalMenuContainer);

    if (!menuActive) {
      generalMenuContainer.style.display = "none";
      generalMenu?.setState((state) => ({ ...state, active: false }));
    }
  },
  onFocus() {
    const isCellSelection = this.editor.state.selection instanceof CellSelection;

    if (this.editor.isActive("element") && !isCellSelection) {
      generalMenuContainer.style.display = "block";
      generalMenu?.setState((state) => ({ ...state, active: true }));
    }
  },
  onUpdate() {
    handleUpdate(this.editor as SolidEditor);
  },
  onSelectionUpdate() {
    handleUpdate(this.editor as SolidEditor);
  }
});

export { ElementMenuPlugin, emitter };
