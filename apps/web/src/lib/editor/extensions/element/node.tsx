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
import {
  EditorState,
  NodeSelection,
  Plugin,
  Selection,
  TextSelection,
  Transaction
} from "@tiptap/pm/state";
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
          !node.attrs._?.uid &&
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
        appendTransaction(_, oldState, newState) {
          if (oldState.selection.eq(newState.selection)) return;

          console.group("APPEND TRANSACTION");

          const insideCustomView = (() => {
            const { selection } = newState;

            for (let { depth } = selection.$from; depth >= 0; depth--) {
              const node = selection.$from.node(depth);

              if (
                node.type.name === "element" &&
                customElements[node.attrs.type.toLowerCase()] // &&
                // (depth !== selection.$from.depth || !(selection instanceof GapCursor))
              ) {
                return true;
              }
            }

            return false;
          })();
          const moved = oldState.selection.$to.pos >= newState.selection.$to.pos ? "up" : "down";

          if (!insideCustomView) {
            console.groupEnd();

            return;
          }

          const processSelection = (selection: Selection): Selection | null => {
            const isGapCursor = selection instanceof GapCursor;
            const isNodeSelection = selection instanceof NodeSelection;

            if (
              isGapCursor &&
              selection.$from.parent.type.name === "element" &&
              customElements[selection.$from.parent.attrs.type.toLowerCase()]
            ) {
              const { nodeAfter, nodeBefore } = selection.$from;

              console.log(moved, nodeBefore, nodeAfter, selection);

              if (!nodeBefore || !nodeAfter) {
                for (let { depth } = selection.$from; depth >= 0; depth--) {
                  const node = selection.$from.node(depth);
                  const pos = selection.$from.before(depth);

                  if (
                    node.type.name === "element" &&
                    customElements[node.attrs.type.toLowerCase()]
                  ) {
                    return ElementSelection.create(newState.tr.doc, pos);
                  }
                }
              } else if (moved === "up" && nodeBefore) {
                return NodeSelection.create(
                  newState.tr.doc,
                  selection.$from.pos - nodeBefore.nodeSize
                );
              } else if (moved === "down" && nodeAfter) {
                return NodeSelection.create(newState.tr.doc, selection.$from.pos);
              }
            }

            if (isNodeSelection) {
              const { nodeAfter, nodeBefore } = selection.$from;
              const { node } = selection;

              if (node?.type.name === "element" && node.content.size && node.attrs._?.uid) {
                const nodePos = selection.$from.pos;
                const textPos = nodePos + 2 + (moved === "up" ? node.nodeSize - 4 : 0);
                const textSelection = TextSelection.create(newState.tr.doc, textPos, textPos);
                const textSelectionParent = textSelection.$from.parent;
                const textSelectionParentPos =
                  textSelection.$from.pos - textSelection.$from.parentOffset - 1;

                if (textSelectionParent.inlineContent) {
                  return textSelection;
                } else {
                  console.log(
                    "ATTEMPT INLINE",
                    textSelection,
                    textSelectionParent,
                    textSelectionParentPos,
                    node
                  );

                  if (
                    textSelectionParent.type.name === "element" &&
                    customElements[textSelectionParent.attrs.type.toLowerCase()]
                  ) {
                    return ElementSelection.create(newState.tr.doc, textSelectionParentPos);
                  }

                  let newTextSelection: TextSelection | null = null;

                  textSelectionParent.descendants((node, pos) => {
                    const absolutePos = textSelectionParentPos + pos;

                    if (newTextSelection) return false;

                    if (node.inlineContent) {
                      console.log("INLINE");
                      newTextSelection = TextSelection.create(
                        newState.tr.doc,
                        absolutePos + 2 + (moved === "up" ? node.nodeSize - 2 : 0),
                        absolutePos + 2 + (moved === "up" ? node.nodeSize - 2 : 0)
                      );

                      return false;
                    } else {
                      return true;
                    }
                  });

                  if (newTextSelection) {
                    return newTextSelection;
                  }
                }
              }

              if (moved === "up" && nodeBefore) {
                return NodeSelection.create(
                  newState.tr.doc,
                  selection.$from.pos - nodeBefore.nodeSize
                );
              } else if (moved === "down" && nodeAfter) {
                const pos = selection.$from.pos + nodeAfter.nodeSize;
                const node = newState.tr.doc.nodeAt(pos);

                if (!node) return new GapCursor(newState.tr.doc.resolve(pos));

                return NodeSelection.create(newState.tr.doc, pos);
              }
            }

            return null;
          };

          let selection = newState.selection as Selection | null;
          let i = 0;

          while (
            selection &&
            ((selection instanceof NodeSelection && !isElementSelection(selection)) ||
              selection instanceof GapCursor)
          ) {
            if (i > 10) throw new Error("Possible infinite loop");

            console.log("BEFORE SELECTION", selection);
            selection = processSelection(selection);
            console.log("AFTER SELECTION", selection);
            i += 1;
          }

          console.groupEnd();

          if (selection) {
            return newState.tr.setSelection(selection).scrollIntoView();
          } else {
            return newState.tr.scrollIntoView();
          }
        }
        /* appendTransaction(transactions, oldState, newState) {
          const insideCustomView = (() => {
            const { selection } = newState;

            for (let depth = 0; depth <= selection.$from.depth; depth++) {
              const node = selection.$from.node(depth);

              if (
                node.type.name === "element" &&
                customElements[node.attrs.type.toLowerCase()] &&
                (depth !== selection.$from.depth || !(selection instanceof GapCursor))
              ) {
                return true;
              }
            }

            return false;
          })();
          const createTextSelection = (
            tr: Transaction,
            position: number,
            dir = 1
          ): Selection | null => {
            const nextSelection = TextSelection.findFrom(tr.doc.resolve(position), dir, true);

            return nextSelection || null;
          };
          const initialSelection = newState.selection;
          const processSelection = (selection: Selection): Selection | null => {
            if (selection instanceof GapCursor) {
              const node = selection.$from.nodeAfter;
              const { nodeAfter, nodeBefore, depth } = selection.$from;

              console.log(nodeBefore, nodeAfter);

              if (oldState.tr.selection.$to.pos >= selection.$to.pos) {
                console.log("MOVED UP");

                if (nodeBefore?.content.size) {
                  const textSelection = createTextSelection(
                    newState.tr,
                    selection.$from.pos - (nodeBefore?.content.size || 0),
                    -1
                  );

                  if (textSelection) {
                    return textSelection;
                  } else {
                    return NodeSelection.findFrom(newState.tr.doc.resolve(selection.$from.pos), -1);
                  }
                } else {
                  const from = selection.$from.pos - (nodeBefore?.content.size || 0) - 2;

                  console.log(from);

                  if (from < 0) {
                    skip = true;

                    return new GapCursor(newState.doc.resolve(0));
                  }

                  if (!nodeBefore) {
                    return createTextSelection(newState.tr, from, -1);
                  }

                  return NodeSelection.create(newState.tr.doc, from);
                }
              } else {
                console.log("MOVED DOWN");

                if (nodeAfter?.content.size) {
                  return createTextSelection(newState.tr, selection.$from.pos + 2);
                } else {
                  const from = selection.$from.pos;

                  if (from > newState.doc.nodeSize) {
                    skip = true;

                    return new GapCursor(newState.doc.resolve(newState.doc.nodeSize));
                  }

                  if (!nodeAfter) {
                    return createTextSelection(newState.tr, from + 2);
                  }

                  return NodeSelection.create(newState.tr.doc, from);
                }
              }
            }

            if (selection instanceof NodeSelection && !isElementSelection(selection)) {
              const node = selection.$from.nodeAfter;

              if (node?.type.name === "element" && customElements[node.attrs.type.toLowerCase()]) {
                return ElementSelection.create(newState.doc, selection.$from.pos, true);
              }

              if (node?.type.name === "element" && !customElements[node.attrs.type.toLowerCase()]) {
                if (node?.content.size) {
                  if (oldState.tr.selection.$to.pos >= selection.$to.pos) {
                    console.log("MOVED UP");

                    return createTextSelection(newState.tr, selection.$from.pos + 2, -1);
                  } else {
                    const textSelection = createTextSelection(newState.tr, selection.$from.pos + 2);

                    console.log("MOVED DOWN", selection.$from.pos + 2, textSelection);

                    return textSelection;
                  }
                } else if (oldState.tr.selection.$to.pos >= selection.$to.pos) {
                  return new GapCursor(selection.$from);
                } else {
                  return new GapCursor(selection.$to);
                }
              }
            }

            return null;
          };

          let skip = false;
          let selection = newState.selection as Selection | null;
          let i = 0;

          while (
            !skip &&
            selection &&
            ((selection instanceof NodeSelection && !isElementSelection(selection)) ||
              selection instanceof GapCursor)
          ) {
            if (i > 10) break;

            console.log("BEFORE SELECTION", selection);
            selection = processSelection(selection);
            console.log("AFTER SELECTION", selection);
            i += 1;
          }

          if (selection && initialSelection !== selection) {
            return newState.tr.setSelection(selection);
          }

          return null;
        }*/
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
        if (typeof props.getPos !== "function" || typeof props.getPos() !== "number") return;

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

          if (node.content.size <= 2) {
            editor
              .chain()
              .setMeta("customView", true)
              .insertContentAt(
                { from: props.getPos() + 1, to: props.getPos() + node.content.size + 1 },
                content.content || []
              )
              .run();
          }
        } else if (parentPos >= 0) {
          const parentElement = props.editor.view.nodeDOM(parentPos) as HTMLElement;

          uid = parentElement?.getAttribute?.("data-uid") || "";
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
            return false;
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
          if (
            event.target instanceof HTMLElement &&
            ["SELECT", "INPUT", "TEXTAREA"].includes(event.target.tagName)
          ) {
            return true;
          }

          return false;
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

export { Element, customViews };
export type { ElementAttributes };
