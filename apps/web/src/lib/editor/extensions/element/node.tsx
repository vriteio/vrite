import { ElementSelection } from "./selection";
import { xmlNodeView } from "./xml-node-view";
import { customNodeView } from "./custom-node-view";
import { Element as BaseElement, ElementAttributes } from "@vrite/editor";
import { SolidEditor } from "@vrite/tiptap-solid";
import { NodeView } from "@tiptap/core";
import { keymap } from "@tiptap/pm/keymap";
import { Fragment, Node, ResolvedPos } from "@tiptap/pm/model";
import { EditorState, NodeSelection, Plugin, TextSelection, Transaction } from "@tiptap/pm/state";
import {
  ExtensionElement,
  ExtensionElementSpec,
  ExtensionElementViewContext
} from "@vrite/sdk/extensions";
import { NodeView as PMNodeView } from "@tiptap/pm/view";
import { nanoid } from "nanoid";
import { JSONContent } from "@vrite/sdk/api";
import { GapCursor } from "@tiptap/pm/gapcursor";
import { ExtensionDetails, ExtensionsContextData } from "#context";
import { getCustomElements } from "./utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    element: {
      setElementSelection: (position: number, active?: boolean) => ReturnType;
    };
  }
}

type StructureNode = { element?: string; content?: string | StructureNode[] };
type CustomView = {
  type: string;
  extension: ExtensionDetails;
  views: Array<{ path: string[]; view: ExtensionElement }>;
  structure: StructureNode;
  getPos(): number;
  node(): Node;
};

const customViews = new Map<string, CustomView>();
const loaders = new Map<string, Promise<void>>();
const registerCustomElementView = async (
  elementSpec: ExtensionElementSpec,
  extension: ExtensionDetails,
  getters: Pick<CustomView, "getPos" | "node">
): Promise<string> => {
  const uid = nanoid();
  const generatedViewData = await extension.sandbox?.generateView<ExtensionElementViewContext>(
    elementSpec.view,
    {
      contextFunctions: ["notify"],
      usableEnv: { readable: [], writable: ["props"] },
      config: extension.config || {}
    },
    { notify: () => {} },
    uid
  );

  if (!generatedViewData) return "";

  const views: Array<{ path: string[]; view: ExtensionElement }> = [
    {
      path: [elementSpec.type.toLowerCase()],
      view: generatedViewData.view
    }
  ];
  const structure: StructureNode = { element: elementSpec.type };
  const processElementTree = (
    parentPath: string[],
    parentStructureNode: StructureNode,
    element: ExtensionElement,
    index?: number
  ): void => {
    if (element.component === "Element") {
      const path = [
        ...parentPath,
        `${element.props?.type || ""}${typeof index === "number" ? `#${index}` : ""}`.toLowerCase()
      ];
      const view = { path, view: { component: "Fragment", slot: element.slot } };
      const structure = { element: `${element.props?.type || ""}` };

      views.push(view);
      parentStructureNode.content = [
        ...(Array.isArray(parentStructureNode.content) ? parentStructureNode.content : []),
        structure
      ];
      element.slot?.forEach((childElement, index) => {
        if (typeof childElement === "object") {
          processElementTree(path, structure, childElement, index);
        }
      });
      return;
    }
    if (element.component === "Content") {
      if (element.slot.length) {
        element.slot?.forEach((childElement, index) => {
          if (typeof childElement === "object") {
            processElementTree(parentPath, parentStructureNode, childElement, index);
          }
        });

        return;
      }
      if (element.props?.content) {
        parentStructureNode.content = `${element.props.content}`;
      }

      return;
    }

    element.slot?.forEach((childElement, index) => {
      if (typeof childElement === "object") {
        processElementTree(parentPath, parentStructureNode, childElement, index);
      }
    });
  };
  processElementTree([elementSpec.type.toLowerCase()], structure, generatedViewData.view);
  customViews.set(uid, {
    type: elementSpec.type.toLowerCase(),
    extension,
    views,
    structure,
    ...getters
  });

  return uid;
};
const getElementPath = (
  resolvedPos: ResolvedPos,
  customElements: Record<
    string,
    {
      element: ExtensionElementSpec;
      extension: ExtensionDetails;
    }
  >
): string[] => {
  let path: string[] = [];

  for (let i = 0; i <= resolvedPos.depth; i++) {
    const node = resolvedPos.node(i);
    const index = resolvedPos.index(i);

    if (node.type.name === "element") {
      const type = `${node.attrs.type || "element"}`.toLowerCase();

      if (!path.length) {
        path = [type];
      } else if (customElements[type]) {
        path = [type];
      } else {
        path.push(`${type}#${index}`);
      }
    }
  }

  if (path.length) {
    path.push(
      `${resolvedPos.nodeAfter?.attrs.type || "element"}#${resolvedPos.index()}`.toLowerCase()
    );
  } else {
    path = [`${resolvedPos.nodeAfter?.attrs.type || "element"}`.toLowerCase()];
  }

  return path;
};
const applyStructure = (node: Node, structure: StructureNode): JSONContent => {
  const nodeJSON = node.toJSON() as JSONContent;
  const applyStructureToNode = (
    nodeJSON: JSONContent | null,
    structureNode: StructureNode
  ): JSONContent | null => {
    if (typeof structureNode.content === "string") {
      // TODO: Apply string content structure
      return {
        type: "element",
        attrs: { ...nodeJSON?.attrs, type: `${structureNode.element}` },
        content: nodeJSON?.content || [{ type: "paragraph", content: [] }]
      };
    } else if (structureNode.content) {
      return {
        type: "element",
        attrs: { ...nodeJSON?.attrs, type: `${structureNode.element}` },
        content: structureNode.content
          .map((childStructureNode, index) => {
            const childNodeJSON = nodeJSON?.content?.[index];

            return applyStructureToNode(childNodeJSON || null, childStructureNode);
          })
          .filter(Boolean) as JSONContent[]
      };
    }

    return {
      type: "element",
      attrs: { ...nodeJSON?.attrs, type: `${structureNode.element}` }
    };
  };

  return applyStructureToNode(nodeJSON, structure)!;
};
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
          this.editor
            .chain()
            .deleteRange({
              from: pos,
              to: pos + node.nodeSize
            })
            .focus()
            .run();

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
          if (!tr.docChanged) return true;

          const entries: Array<{ node: Node; pos: number }> = [];

          tr.doc.descendants((node, pos) => {
            if (node.type.name === "element" && customElements[node.attrs.type.toLowerCase()]) {
              entries.push({ node, pos });

              return false;
            }
          });

          for (const entry of entries) {
            const activeElementNode = entry.node;
            const activePos = entry.pos;
            const uid = (editor.view.nodeDOM(activePos) as HTMLElement)?.getAttribute("data-uid");

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

          if (newState.selection instanceof NodeSelection) {
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
      const referenceView = new NodeView(() => {}, props);
      const wrapper = document.createElement("div");
      const contentWrapper = document.createElement("div");
      const loadingId = nanoid();

      let { node } = props;
      let selected = false;
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
      // Determine view
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
          uid = await registerCustomElementView(customElement.element, customElement.extension, {
            getPos: props.getPos,
            node: () => node
          });

          const customView = customViews.get(uid);
          const content = applyStructure(node, customView?.structure!);

          editor.commands.insertContentAt(
            { from: props.getPos() + 1, to: props.getPos() + node.content.size },
            content.content || []
          );
        } else if (parentPos >= 0) {
          const parentElement = props.editor.view.nodeDOM(parentPos) as HTMLElement;

          uid = parentElement.getAttribute("data-uid") || "";
        }

        if (uid) {
          const customView = customViews.get(uid);
          const matchedView = customView?.views.find((view) => {
            return view.path.join(".") === path.join(".");
          });

          if (customView) {
            view = customNodeView({
              props,
              editor,
              uid,
              view: matchedView?.view!,
              extension: customView.extension,
              contentWrapper,
              wrapper,
              getProps() {
                return customView.node().attrs.props || {};
              },
              getSelected() {
                return selected;
              },
              updateProps(newProps) {
                const pos = customView.getPos();

                if (typeof pos !== "number" || pos > editor.view.state.doc.nodeSize) return;

                editor.commands.command(({ tr, dispatch }) => {
                  if (!dispatch) return false;

                  const pos = customView.getPos();
                  const node = customView.node();

                  if (typeof pos !== "number" || pos > editor.view.state.doc.nodeSize) {
                    return false;
                  }

                  if (node && node.type.name === "element") {
                    dispatch(tr.setNodeAttribute(pos, "props", { ...newProps }));
                  }

                  return true;
                });
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
          selected = true;
          view?.selectNode?.();
        },
        deselectNode() {
          selected = false;
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

          node = newNode;

          return true;
        }
      };
    };
  }
});

export { Element };
export type { ElementAttributes };
