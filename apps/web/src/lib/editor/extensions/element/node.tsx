import { ElementSelection, isElementSelection } from "./selection";
import { xmlNodeView } from "./xml-node-view";
import { customNodeView } from "./custom-node-view";
import {
  applyStructure,
  createCustomView,
  getCustomElements,
  getElementPath,
  updateElementProps
} from "./utils";
import { ElementDisplay, createLoader, customViews, emitter, getTreeUID } from "./view-manager";
import { Element as BaseElement, ElementAttributes } from "@vrite/editor";
import { SolidEditor } from "@vrite/tiptap-solid";
import { NodeView } from "@tiptap/core";
import { Fragment, Node, Slice } from "@tiptap/pm/model";
import { NodeSelection, Plugin, PluginKey, Selection, TextSelection } from "@tiptap/pm/state";
import { GapCursor } from "@tiptap/pm/gapcursor";
import { createSignal } from "solid-js";
import { ExtensionElementSpec } from "@vrite/sdk/extensions";
import { CellSelection } from "@tiptap/pm/tables";
import { ExtensionDetails, ExtensionsContextData } from "#context";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    element: {
      setElementSelection: (position: number, active?: boolean) => ReturnType;
    };
  }
}

const Element = BaseElement.extend<
  Partial<ExtensionsContextData>,
  {
    customElements: Record<
      string,
      {
        element: ExtensionElementSpec;
        extension: ExtensionDetails;
      }
    >;
  }
>({
  addOptions() {
    return {};
  },
  addStorage() {
    {
      return { customElements: {} };
    }
  },
  addKeyboardShortcuts() {
    const handleDeleteElement = (): boolean => {
      const { state } = this.editor;

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

        if (!node || !pos) return false;

        const element = this.editor.view.nodeDOM(pos) as HTMLElement;
        const uid = element?.getAttribute?.("data-uid") || "";

        if (
          !node.textContent &&
          !uid &&
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

    return {
      Delete: handleDeleteElement,
      Backspace: handleDeleteElement
    };
  },
  addProseMirrorPlugins() {
    const { storage, editor } = this;

    return [
      new Plugin({
        key: new PluginKey("element"),
        state: {
          init() {
            return {};
          },
          apply(tr, previousValue) {
            const elementViewTypeData = tr.getMeta("elementViewTypeData");

            if (!elementViewTypeData) return previousValue;

            const customView = customViews.get(elementViewTypeData.uid);

            if (customView) {
              customView.rawView = !customView.rawView;
              emitter.emit(`update:${elementViewTypeData.uid}`);
            }

            return previousValue;
          }
        },
        props: {
          transformCopied: (slice) => {
            const expectedSize = slice.size + 2;

            if (slice.content.childCount > 1) return slice;

            let currentFragment: Fragment = slice.content;
            let { openStart } = slice;
            let { openEnd } = slice;

            while (currentFragment.size > expectedSize) {
              const newFragment = currentFragment.child(0).content;

              if (newFragment.childCount !== 1) {
                break;
              }

              currentFragment = newFragment;
              openStart += 1;
              openEnd += 1;
            }

            return new Slice(currentFragment, openStart, openEnd);
          },
          handleClick(_, pos, event) {
            const { target } = event;

            if (!(target instanceof HTMLElement)) return;

            if (target.matches("p,div.content,p *")) {
              editor.commands.command(({ tr }) => {
                tr.setSelection(TextSelection.near(editor.state.doc.resolve(pos), 1));

                return true;
              });

              return true;
            }

            if (
              event.target instanceof HTMLElement &&
              event.target.getAttribute("data-element-code")
            ) {
              return true;
            }
          }
        },
        appendTransaction(transactions, oldState, newState) {
          const { customElements } = storage;

          let selection = newState.selection as Selection | null;

          if (newState.selection instanceof TextSelection) {
            const isAtEnd = newState.selection.$from.pos === newState.doc.nodeSize - 3;
            const docChanged = transactions.some((transaction) => transaction.docChanged);

            if (
              isAtEnd &&
              docChanged &&
              !(oldState.selection instanceof TextSelection) &&
              !oldState.selection.eq(newState.selection)
            ) {
              let previousFrom = oldState.selection.$from.pos;
              let previousTo = oldState.selection.$to.pos;

              if (oldState.selection instanceof CellSelection) {
                previousFrom = oldState.selection.$anchorCell.pos;
                previousTo = oldState.selection.$headCell.pos;
              }

              selection = Selection.near(
                newState.tr.doc.resolve(
                  Math.min(previousFrom + 1, previousTo + 1, newState.tr.doc.nodeSize - 2)
                ),
                -1
              );
            }
          }

          const insideCustomView = (() => {
            if (!selection) return false;

            for (let { depth } = selection.$from; depth >= 0; depth--) {
              const node = selection.$from.node(depth);

              if (node.type.name === "element" && customElements[node.attrs.type.toLowerCase()]) {
                return true;
              }
            }

            return false;
          })();
          const moved = oldState.selection.$to.pos >= newState.selection.$to.pos ? "up" : "down";

          if (!insideCustomView) {
            if (
              newState.selection instanceof NodeSelection &&
              newState.selection.node.type.name === "element" &&
              !isElementSelection(newState.selection)
            ) {
              return newState.tr.setSelection(
                ElementSelection.create(newState.tr.doc, newState.selection.$from.pos)
              );
            }

            if (newState.selection instanceof GapCursor) {
              return newState.tr.scrollIntoView();
            }

            return newState.tr;
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
              const element = editor.view.nodeDOM(selection.$from.pos) as HTMLElement;
              const uid = element?.getAttribute?.("data-uid") || "";

              if (node.type.name !== "element") return null;

              if (node?.type.name === "element" && node.content.size && uid) {
                const nodePos = selection.$from.pos;
                const textPos = nodePos + 2 + (moved === "up" ? node.nodeSize - 4 : 0);
                const textSelection = TextSelection.create(newState.tr.doc, textPos, textPos);
                const textSelectionParent = textSelection.$from.parent;
                const textSelectionParentPos =
                  textSelection.$from.pos - textSelection.$from.parentOffset - 1;

                if (textSelectionParent.inlineContent) {
                  return textSelection;
                } else {
                  if (
                    textSelectionParent.type.name === "element" &&
                    customElements[textSelectionParent.attrs.type.toLowerCase()]
                  ) {
                    return new GapCursor(newState.tr.doc.resolve(textSelectionParentPos));
                  }

                  let newTextSelection: TextSelection | null = null;

                  textSelectionParent.descendants((node, pos) => {
                    const absolutePos = textSelectionParentPos + pos;

                    if (newTextSelection) return false;

                    if (node.inlineContent) {
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
                const pos = selection.$from.pos + nodeAfter.nodeSize;
                const node = newState.tr.doc.nodeAt(pos);

                if (!node) return new GapCursor(newState.tr.doc.resolve(pos));

                return NodeSelection.create(newState.tr.doc, pos);
              }
            }

            return null;
          };
          const originalSelection = newState.selection;

          let i = 0;

          while (
            selection &&
            ((selection instanceof NodeSelection && !isElementSelection(selection)) ||
              selection instanceof GapCursor)
          ) {
            if (i > 100) break;

            const newSelection = processSelection(selection);

            selection = newSelection || selection;
            i += 1;
            if (!newSelection) break;
          }

          if (selection) {
            if (selection === originalSelection) return;

            if (isElementSelection(selection)) {
              const element = editor.view.nodeDOM(selection.$from.pos);

              if (element instanceof HTMLElement) {
                const boundingRect = element.getBoundingClientRect();

                if (
                  boundingRect.y + boundingRect.height > 40 &&
                  boundingRect.y + 32 < window.innerHeight
                ) {
                  return newState.tr.setSelection(selection);
                }
              }
            }

            return newState.tr.setSelection(selection).scrollIntoView();
          } else {
            return newState.tr.scrollIntoView();
          }
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
  onCreate() {
    this.storage.customElements = getCustomElements(this.options.installedExtensions?.() || []);
  },
  addNodeView() {
    const editor = this.editor as SolidEditor;
    const { storage } = this;

    return (props) => {
      const [elementPropsJSON, setElementPropsJSON] = createSignal(
        JSON.stringify(props.node.attrs.props || {})
      );
      const referenceView = new NodeView(() => {}, props);
      const wrapper = document.createElement("div");
      const contentWrapper = document.createElement("div");
      const loaded = createLoader(wrapper);

      let { node } = props;
      let uid: string | null = null;
      let view: ElementDisplay | null = null;
      let removeListener = (): void => {};

      wrapper.setAttribute("data-element", "true");
      requestAnimationFrame(async () => {
        if (typeof props.getPos !== "function" || typeof props.getPos() !== "number") return;

        const { customElements } = this.storage;
        const customNodeType = node.attrs.type.toLowerCase();
        const customElement = customNodeType ? customElements[customNodeType] : null;
        const resolvedPos = editor.state.doc.resolve(props.getPos());
        const path = getElementPath(resolvedPos, customElements);

        uid = await getTreeUID(editor, props.getPos());

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
            uid = customView.uid || uid;
            customViews.set(customView.uid, customView);
          }

          const content = applyStructure(node, customView?.structure!);

          if (node.content.size <= 2) {
            editor
              .chain()
              .insertContentAt(
                { from: props.getPos() + 1, to: props.getPos() + node.content.size + 1 },
                content.content || []
              )
              .run();
          }
        }

        const loadView = (): void => {
          if (uid && !customViews.get(uid)?.rawView) {
            const customView = customViews.get(uid);
            const matchedView = customView?.views.find((view) => {
              return view.path.join(".") === path.join(".");
            });

            if (customView && matchedView) {
              if (uid) wrapper.setAttribute("data-uid", uid);

              view = customNodeView({
                props: { ...props, node },
                editor,
                uid,
                view: matchedView?.view!,
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
              loaded();

              return;
            }
          }

          view = xmlNodeView({ props: { ...props, node }, editor, wrapper, contentWrapper });
          loaded();
        };

        removeListener = emitter.on(`update:${uid}`, (uid) => {
          view?.unmount();
          loadView();
        });
        loadView();
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
          view?.onSelect?.();
        },
        deselectNode() {
          view?.onDeselect?.();
        },
        destroy() {
          removeListener();
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
        update(newNode) {
          if (
            node.type !== newNode.type ||
            typeof props.getPos !== "function" ||
            typeof props.getPos() !== "number" ||
            newNode.type.name !== "element" ||
            Boolean(newNode.content.size) !== Boolean(node.content.size)
          ) {
            if (uid && customViews.has(uid)) {
              customViews.delete(uid);
            }

            return false;
          }

          view?.onUpdate?.(newNode);

          if (
            newNode.attrs.type !== node.attrs.type &&
            storage.customElements[newNode.attrs.type.toLowerCase()] !==
              storage.customElements[node.attrs.type.toLowerCase()]
          ) {
            if (uid && customViews.has(uid)) {
              customViews.delete(uid);
            }

            return false;
          }

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
