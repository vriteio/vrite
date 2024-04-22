import { ElementSelection, isElementSelection } from "./selection";
import { xmlNodeView } from "./xml-node-view";
import { customNodeView } from "./custom-node-view";
import {
  CustomView,
  applyStructure,
  createCustomView,
  getCustomElements,
  getElementPath,
  updateElementProps
} from "./utils";
import { Element as BaseElement, ElementAttributes } from "@vrite/editor";
import { SolidEditor } from "@vrite/tiptap-solid";
import { NodeView } from "@tiptap/core";
import { keymap } from "@tiptap/pm/keymap";
import { Node } from "@tiptap/pm/model";
import { EditorState, NodeSelection, Plugin, TextSelection, Transaction } from "@tiptap/pm/state";
import { NodeView as PMNodeView } from "@tiptap/pm/view";
import { nanoid } from "nanoid";
import { GapCursor } from "@tiptap/pm/gapcursor";
import { createSignal } from "solid-js";
import { ExtensionsContextData } from "#context";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    element: {
      setElementSelection: (position: number, active?: boolean) => ReturnType;
    };
  }
}

const customViews = new Map<string, CustomView>();
const loaders = new Map<string, Promise<void>>();
const Element = BaseElement.extend<Partial<ExtensionsContextData>>({
  addOptions() {
    return {};
  },
  addProseMirrorPlugins() {
    const handleDeleteElement = (state: EditorState): boolean => {
      if (this.editor.isActive("element")) {
        const currentDepth = state.selection.$from.depth;

        let node: Node | null = null;
        let pos: number | null = null;

        for (let i = currentDepth; i >= 0; i--) {
          const currentNode = state.selection.$from.node(i);

          if (currentNode.type.name === "element") {
            node = currentNode;
            pos = i > 0 ? state.selection.$from.before(i) : 0;
            break;
          }
        }

        if (
          node &&
          !node.textContent &&
          node.content.childCount === 1 &&
          node.content.firstChild?.type.name === "paragraph" &&
          typeof pos === "number"
        ) {
          const chain = this.editor.chain();

          if (state.doc.resolve(pos).parent.childCount === 1) {
            chain.insertContentAt(
              { from: pos, to: pos + node.nodeSize },
              { type: "paragraph", content: [] }
            );
          } else {
            chain.deleteRange({
              from: pos,
              to: pos + node.nodeSize
            });
          }

          chain.focus().run();

          return true;
        }
      }

      return false;
    };
    const { installedExtensions } = this.options;
    const editor = this.editor as SolidEditor;

    let customElements = getCustomElements(installedExtensions);

    requestAnimationFrame(() => {
      customElements = getCustomElements(installedExtensions);
    });

    return [
      keymap({
        Delete: handleDeleteElement,
        Backspace: handleDeleteElement
      }),
      new Plugin({
        filterTransaction(tr) {
          if (!tr.docChanged || tr.getMeta("customView")) return true;

          const entries: Array<{ node: Node; pos: number }> = [];

          tr.doc.descendants((node, pos) => {
            if (node.type.name === "element" && customElements[node.attrs.type.toLowerCase()]) {
              entries.push({ node, pos });

              return true;
            }
          });

          for (const entry of entries) {
            const activeElementNode = entry.node;
            const activePos = entry.pos;
            const element = editor.view.nodeDOM(activePos) as HTMLElement;
            const uid = element instanceof HTMLElement ? element?.getAttribute("data-uid") : null;

            if (!uid) continue;

            const customView = customViews.get(uid);

            if (
              JSON.stringify(applyStructure(activeElementNode, customView?.structure!)) !==
              JSON.stringify(activeElementNode.toJSON())
            ) {
              return false;
            }
          }

          return true;
        },
        appendTransaction(_, oldState, newState) {
          const setTextSelection = (tr: Transaction, position: number, dir = 1): Transaction => {
            const nextSelection = TextSelection.findFrom(tr.doc.resolve(position), dir, true);

            if (nextSelection) {
              return tr.setSelection(nextSelection);
            }

            return tr;
          };

          if (
            newState.selection instanceof NodeSelection &&
            !isElementSelection(newState.selection)
          ) {
            const node = newState.selection.$from.nodeAfter;

            if (node?.type.name === "element") {
              if (node?.content.size) {
                if (oldState.tr.selection.$to.pos >= newState.selection.$to.pos) {
                  return setTextSelection(
                    newState.tr,
                    newState.selection.$from.pos + (node.content.size || 0),
                    -1
                  );
                } else {
                  return setTextSelection(newState.tr, newState.selection.$from.pos + 2);
                }
              } else if (oldState.selection.$to.pos === newState.selection.$to.pos) {
                return newState.tr.setSelection(new GapCursor(newState.selection.$from));
              } else {
                return newState.tr.setSelection(new GapCursor(newState.selection.$to));
              }
            }
          }

          return null;
        }
      })
    ];
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setElementSelection(position, active) {
        return ({ tr, dispatch }) => {
          if (dispatch) {
            const { doc } = tr;
            const from = Math.max(position, 0);
            const selection = ElementSelection.create(doc, from, active);

            tr.setSelection(selection);
          }

          return true;
        };
      }
    };
  },
  addNodeView() {
    return (props) => {
      const [elementPropsJSON, setElementPropsJSON] = createSignal(
        JSON.stringify(props.node.attrs.props || {})
      );

      let { node } = props;

      const referenceView = new NodeView(() => {}, props);
      const wrapper = document.createElement("div");
      const contentWrapper = document.createElement("div");
      const loadingId = nanoid();

      let view: Partial<PMNodeView> | null = null;
      let resolveLoader = (): void => {};

      wrapper.setAttribute("data-element", "true");
      wrapper.setAttribute("data-loading-id", loadingId);
      loaders.set(
        loadingId,
        new Promise<void>((resolve) => {
          resolveLoader = resolve;
        }).then(() => {
          loaders.delete(loadingId);
          wrapper.removeAttribute("data-loading-id");
        })
      );
      requestAnimationFrame(async () => {
        if (typeof props.getPos !== "function") return;

        const { installedExtensions } = this.options;
        const editor = this.editor as SolidEditor;
        const customNodeType = node.attrs.type.toLowerCase();
        const customElements = getCustomElements(installedExtensions);
        const customElement = customNodeType ? customElements[customNodeType] : null;
        const resolvedPos = props.editor.state.doc.resolve(props.getPos());
        const parentPos = props.getPos() - resolvedPos.parentOffset - 1;
        const path = getElementPath(resolvedPos, customElements);

        if (parentPos >= 0) {
          const parentElement = props.editor.view.nodeDOM(parentPos) as HTMLElement;
          const parentLoadingId = parentElement.getAttribute("data-loading-id");

          if (parentLoadingId) {
            await loaders.get(parentLoadingId);
          }
        }

        let uid = "";

        if (customElement) {
          const customView = await createCustomView(
            customElement.element,
            customElement.extension,
            editor,
            {
              getPos: props.getPos,
              node: () => node
            }
          );

          if (customView) {
            uid = uid || customView.uid;
            customViews.set(customView.uid, customView);
          }

          const content = applyStructure(node, customView?.structure!);

          editor
            .chain()
            .setMeta("customView", true)
            .insertContentAt(
              { from: props.getPos() + 1, to: props.getPos() + node.content.size + 1 },
              content.content || []
            )
            .run();
        } else if (parentPos >= 0) {
          const parentElement = props.editor.view.nodeDOM(parentPos) as HTMLElement;

          uid = parentElement.getAttribute("data-uid") || "";
        }

        if (uid) {
          const customView = customViews.get(uid);
          const matchedView = customView?.views.find((view) => {
            return view.path.join(".") === path.join(".");
          });

          if (customView && matchedView) {
            view = customNodeView({
              props,
              editor,
              uid,
              view: matchedView?.view!,
              top: matchedView.top,
              extension: customView.extension,
              contentWrapper,
              wrapper,
              getProps() {
                return JSON.parse(elementPropsJSON());
              },
              updateProps(newProps) {
                updateElementProps(newProps, editor, customView);
              }
            });
            resolveLoader();

            return;
          }
        }

        view = xmlNodeView({ props, editor, wrapper, contentWrapper });
        resolveLoader();
      });

      return {
        dom: wrapper,
        contentDOM: contentWrapper,
        ignoreMutation(mutation: MutationRecord | { type: "selection"; target: Element }) {
          if (mutation.type === "selection") {
            return true;
          }

          return referenceView.ignoreMutation(mutation);
        },
        selectNode() {
          view?.selectNode?.();
        },
        deselectNode() {
          view?.deselectNode?.();
        },
        stopEvent(event) {
          return referenceView.stopEvent(event);
        },
        update(newNode, decorations, innerDecorations) {
          view?.update?.(newNode, decorations, innerDecorations);
          if (newNode.type.name !== "element") return false;
          if (newNode.attrs.type !== node.attrs.type) return false;
          if (Boolean(newNode.content.size) !== Boolean(node.content.size)) return false;

          setElementPropsJSON(JSON.stringify(newNode.attrs.props || {}));
          node = newNode;

          return true;
        }
      };
    };
  }
});

export { Element };
export type { ElementAttributes };
