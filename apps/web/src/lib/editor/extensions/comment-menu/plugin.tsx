import { CommentMenu } from "./component";
import { Editor, Extension, getAttributes } from "@tiptap/core";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { debounce } from "@solid-primitives/scheduled";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const box = document.createElement("div");

let component: SolidRenderer<{
  editor: SolidEditor;
  fragment: string;
  contentOverlap: boolean;
  setFragment(fragment: string): void;
  updatePosition(): void;
}> | null = null;

const updatePosition = (editor: Editor): void => {
  const { selection } = editor.state;
  const selectedNode = selection.$from.parent;

  if (!selectedNode || !editor.view) return;

  const container = document.getElementById("pm-container");
  const parentPos = container?.getBoundingClientRect();
  const viewWidth = container?.parentElement?.offsetWidth || parentPos?.width || 0;
  const node = editor.view.domAtPos(selection.from - selection.$from.parentOffset)
    .node as HTMLElement;
  const childPos = node.getBoundingClientRect();

  if (!parentPos || !childPos) return;

  box.style.top = "0px";
  box.style.right = "0px";
  box.style.display = "block";
  box.style.transform = `translateX(${Math.min(viewWidth - parentPos.width + 24, 360)}px)`;
  component?.setState((state) => ({
    ...state,
    contentOverlap: viewWidth - parentPos.width + 24 < 360
  }));
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
      updatePosition(this.editor);
    }, 250);

    component = new SolidRenderer(CommentMenu, {
      editor: this.editor as SolidEditor,
      state: {
        editor: this.editor as SolidEditor,
        fragment: "",
        contentOverlap: false as boolean,
        updatePosition() {
          updatePosition(this.editor);
        },
        setFragment(fragment: string) {
          component?.setState((state) => ({
            ...state,
            fragment
          }));
        }
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
    setTimeout(() => {
      updatePosition(this.editor);
    }, 0);
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("handleClickLink"),
        props: {
          handleClick: (view, _pos, event) => {
            if (event.button !== 0) {
              return false;
            }

            const attrs = getAttributes(view.state, "comment");

            component?.setState((state) => ({
              ...state,
              fragment: attrs.thread || ""
            }));

            if (attrs.thread) {
              return true;
            }

            return false;
          }
        }
      })
    ];
  }
});

export { CommentMenuPlugin };
