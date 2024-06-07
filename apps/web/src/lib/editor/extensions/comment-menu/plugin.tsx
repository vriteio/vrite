import { CommentMenu } from "./component";
import { Comment } from "@vrite/editor";
import { Editor, getAttributes } from "@tiptap/core";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { debounce } from "@solid-primitives/scheduled";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DecorationSet, Decoration } from "@tiptap/pm/view";
import { Mark } from "@tiptap/pm/model";

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
    contentOverlap: (viewWidth - parentPos.width) / 2 + 24 < 360
  }));
};
const CommentMenuPluginKey = new PluginKey("commentMenu");
const CommentMenuPlugin = Comment.extend({
  exitable: true,
  addStorage() {
    return {
      resizeHandler: () => {}
    };
  },
  addCommands() {
    return {
      setComment: (attributes) => {
        return ({ commands }) => {
          component?.state().setFragment(attributes.thread || "");

          return commands.setMark("comment", attributes);
        };
      },
      unsetComment: () => {
        return ({ commands }) => {
          component?.state().setFragment("");

          return commands.unsetMark("comment");
        };
      }
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
          this.editor.view.dispatch(
            this.editor.view.state.tr.setMeta(CommentMenuPluginKey, { fragment })
          );
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
        key: CommentMenuPluginKey,
        props: {
          decorations(state) {
            const activeMarks: Array<{ mark: Mark; pos: number; size: number }> = [];

            state.doc.descendants((node, pos) => {
              const commentMark = node.marks.find((mark) => mark.type.name === "comment");

              if (
                node.type.name === "text" &&
                commentMark &&
                commentMark.attrs.thread === component?.state().fragment
              ) {
                activeMarks.push({
                  mark: commentMark,
                  pos,
                  size: node.nodeSize
                });
              }
            });

            const decorations: Decoration[] = [];

            activeMarks.forEach(({ mark, pos, size }) => {
              decorations.push(
                Decoration.inline(pos, pos + size, { class: "active" }, { ...mark.attrs })
              );
            });

            return DecorationSet.create(state.doc, decorations);
          },
          handleClick: (view, _pos, event) => {
            if (event.button !== 0) {
              return false;
            }

            const attrs = getAttributes(view.state, "comment");

            component?.state().setFragment(attrs.thread || "");

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
