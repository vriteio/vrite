import { CommentMenu } from "./component";
import { Editor, Extension } from "@tiptap/core";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { debounce } from "@solid-primitives/scheduled";

const box = document.createElement("div");

let component: SolidRenderer<{
  editor: SolidEditor;
}> | null = null;

const handleUpdate = (editor: Editor): void => {
  const { selection } = editor.state;
  const selectedNode = selection.$from.parent;

  if (!selectedNode || !editor.view) {
    box.style.display = "none";

    return;
  }

  const container = document.getElementById("pm-container");
  const parentPos = container?.getBoundingClientRect();
  const viewWidth = container?.parentElement?.offsetWidth || parentPos?.width || 0;
  const node = editor.view.domAtPos(selection.from - selection.$from.parentOffset)
    .node as HTMLElement;
  const childPos = node.getBoundingClientRect();

  if (!parentPos || !childPos) return;

  box.style.top = `${childPos.top - (parentPos?.top || 0)}px`;
  box.style.right = "0px";
  box.style.display = "block";
  box.style.transform = `translateX(${Math.min(viewWidth - parentPos.width + 24, 384)}px)`;
};
const CommentMenuPlugin = Extension.create({
  name: "commentMenu",
  addStorage() {
    return {
      resizeHandler: () => {}
    };
  },
  onCreate() {
    const debouncedHandleUpdate = debounce(() => {
      handleUpdate(this.editor);
    }, 250);

    component = new SolidRenderer(CommentMenu, {
      editor: this.editor as SolidEditor,
      state: {
        editor: this.editor as SolidEditor
      }
    });
    box.style.position = "absolute";
    box.style.top = "-100vh";
    box.style.right = "100vw";
    box.appendChild(component.element);
    document.getElementById("pm-container")?.appendChild(box);
    this.storage.resizeHandler = debouncedHandleUpdate;
    window.addEventListener("resize", this.storage.resizeHandler);
  },
  onDestroy() {
    window.removeEventListener("resize", this.storage.resizeHandler);
    box.remove();
  },
  onFocus() {
    if (this.editor.isActive("comment")) {
      box.style.display = "block";
    }
  },
  onSelectionUpdate() {
    handleUpdate(this.editor);
  }
});

export { CommentMenuPlugin };
