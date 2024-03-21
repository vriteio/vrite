import { ElementSelection, isElementSelection, isElementSelectionActive } from "./selection";
import { Element as BaseElement, ElementAttributes } from "@vrite/editor";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { NodeView } from "@tiptap/core";
import { keymap } from "@tiptap/pm/keymap";
import { Node, Slice } from "@tiptap/pm/model";
import { EditorState, NodeSelection, Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Node as PMNode } from "@tiptap/pm/model";
import { ExtensionElementViewContext } from "@vrite/sdk/extensions";
import { createEffect } from "solid-js";
import { formatCode } from "#lib/code-editor";
import { ExtensionDetails, ExtensionsContextData, useExtensions, useNotifications } from "#context";
import { ExtensionViewRenderer } from "#lib/extensions";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    element: {
      setElementSelection: (position: number, active?: boolean) => ReturnType;
    };
  }
}

interface ExtensionElementSpec {
  type: string;
  view: string;
}

const i = 0;
const getOpeningTag = async (node: PMNode): Promise<string> => {
  const keyValueProps = Object.entries(node.attrs.props).map(([key, value]) => {
    if (value === true) return key;

    const useBrackets = typeof value !== "string" || value.includes("\n") || value.includes(`"`);

    return `${key}=${useBrackets ? "{" : ""}${JSON.stringify(value)}${useBrackets ? "}" : ""}`;
  });
  const c = `<${node.attrs.type}${keyValueProps.length ? " " : ""}${keyValueProps.join(" ")}>`;
  const codeTagClosed = c.trim().replace(/>$/, "/>") || "";
  const formattedCode = await formatCode(codeTagClosed, "typescript", {
    printWidth: 60,
    trailingComma: "none",
    singleQuote: false
  });

  return formattedCode.replace(/ *?\/>;/gm, node.content.size ? ">" : "/>").trim();
};
const getClosingTag = (node: PMNode): string => node.attrs.type;
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

    return [
      keymap({
        Delete: handleDeleteElement,
        Backspace: handleDeleteElement
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
      const { getPos } = props;
      const referenceView = new NodeView(() => {}, props);
      const { installedExtensions } = this.options;

      let node = props.node as Node;

      const customNodeType = node.attrs.type.toLowerCase();
      const customElements = (): Record<
        string,
        {
          element: ExtensionElementSpec;
          extension: ExtensionDetails;
        }
      > => {
        const elements: Record<
          string,
          {
            element: ExtensionElementSpec;
            extension: ExtensionDetails;
          }
        > = {};

        installedExtensions?.().forEach((extension) => {
          if (!extension.id) return;

          const spec = extension.sandbox?.spec;

          if (spec?.elements) {
            spec.elements.forEach((element) => {
              elements[element.type.toLowerCase()] = {
                element,
                extension
              };
            });
          }
        });

        return elements;
      };

      if (customNodeType && customElements()[customNodeType]) {
        const contentDOM = document.createElement("div");
        const { element, extension } = customElements()[customNodeType];
        const component = new SolidRenderer(
          (props: {
            state: {
              editor: SolidEditor;
              pos: number;
              props: Record<string, any>;
            };
          }) => {
            const { notify } = useNotifications();

            return (
              <ExtensionViewRenderer<ExtensionElementViewContext>
                viewId={element.view}
                extension={extension}
                contentEditable={false}
                ctx={{
                  contextFunctions: ["notify"],
                  usableEnv: { readable: [], writable: ["props"] },
                  config: extension.config || {},
                  content: {
                    props: { "data-content": "true", "class": "w-full" },
                    component: "View",
                    slot: []
                  }
                }}
                func={{
                  notify
                }}
                usableEnvData={{ props: props.state.props }}
                onUsableEnvDataUpdate={(data) => {
                  props.state.editor.commands.command(({ tr, dispatch }) => {
                    if (!dispatch) return false;

                    const node = props.state.editor.view.state.doc.nodeAt(props.state.pos);

                    if (node && node.type.name === "element") {
                      tr.setNodeAttribute(props.state.pos, "props", data.props);
                    }

                    return true;
                  });
                }}
                onInitiated={() => {
                  component.element.querySelector("[data-content=true]")?.append(contentDOM);
                }}
              />
            );
          },
          {
            editor: this.editor as SolidEditor,
            state: {
              props: node.attrs.props,
              editor: props.editor as SolidEditor,
              pos: typeof props.getPos === "function" ? props.getPos() : 0
            }
          }
        );

        component.element.setAttribute("class", "!m-0");
        component.element.setAttribute("data-element", "true");
        contentDOM.setAttribute("class", "content relative contents items-start");

        return {
          dom: component.element,
          contentDOM: element.type === "Severity" ? null : contentDOM,
          ignoreMutation(mutation: MutationRecord | { type: "selection"; target: Element }) {
            if (mutation.type === "selection") {
              return true;
            }

            return referenceView.ignoreMutation(mutation);
          },
          selectNode() {
            if (element.type !== "Severity") {
              props.editor.commands.setTextSelection(props.getPos() + 1);
            }
          },
          stopEvent(event) {
            return referenceView.stopEvent(event);
          },
          update(newNode) {
            if (newNode.type.name !== "element") return false;

            const imageNodes: Array<{ node: PMNode; pos: number }> = [];

            newNode.content.descendants((node, pos) => {
              if (node.type.name === "image") {
                imageNodes.push({ node, pos });
              }
            });

            const basePos = typeof props.getPos === "function" ? props.getPos() : 0;

            /* if (basePos && newNode.childCount < node.childCount) {
              const oldNode = node;

              // if (i > 0) return;

              requestAnimationFrame(() => {
                const lastPos = basePos;
                const { state } = props.editor.view;
                const { selection } = state;
                const tr = state.tr
                  .setSelection(NodeSelection.create(state.doc, lastPos))
                  .replaceSelection(
                    Slice.fromJSON(state.schema, { type: "doc", content: [oldNode.toJSON()] })
                  );

                props.editor.view.dispatch(tr);
              });
            }*/

            /* if (basePos) {
              if (!newNode.content.size) {
                requestAnimationFrame(() => {
                  const lastPos = basePos;
                  const { state } = props.editor.view;
                  const tr = state.tr.replaceWith(
                    lastPos + 1,
                    lastPos + 1,
                    props.editor.schema.node("paragraph")
                  );

                  props.editor.view.dispatch(tr);
                });
              } else if (imageNodes.length) {
                requestAnimationFrame(() => {
                  const { state } = props.editor.view;

                  let { tr } = state;

                  imageNodes.forEach(({ node, pos }) => {
                    const lastPos = basePos + pos;

                    tr = tr
                      .deleteRange(lastPos + 1, lastPos + node.nodeSize + 1)
                      .setSelection(TextSelection.create(tr.doc, lastPos));
                  });
                  props.editor.view.dispatch(tr);
                });
              } else if (newNode.content.childCount > 1) {
                /* requestAnimationFrame(() => {
                  const lastPos = basePos;
                  const { state } = props.editor.view;

                  let { tr } = state;

                  tr = tr
                    .deleteRange(
                      lastPos + newNode.child(0).nodeSize + 1,
                      lastPos + newNode.content.size + 1
                    )
                    .setSelection(TextSelection.create(tr.doc, lastPos));
                  props.editor.view.dispatch(tr);
                });
              }
            }*/

            node = newNode as Node;
            component.setState((state) => ({
              ...state,
              props: node.attrs.props,
              pos: typeof props.getPos === "function" ? props.getPos() : 0
            }));

            return true;
          }
        };
      }

      const editor = this.editor as SolidEditor;
      const dom = document.createElement("div");
      const contentContainer = document.createElement("div");
      const content = document.createElement("div");
      const code = document.createElement("code");
      const bottomCode = document.createElement("code");
      const bottomCodeStart = document.createElement("span");
      const bottomCodeKey = document.createElement("span");
      const bottomCodeEnd = document.createElement("span");
      const handleCodeClick = (event: MouseEvent): void => {
        if (typeof props.getPos === "function") {
          editor.commands.setElementSelection(props.getPos(), true);
        }

        event.preventDefault();
        event.stopPropagation();
      };

      getOpeningTag(props.node).then((openingTag) => (code.textContent = openingTag));
      bottomCodeKey.textContent = getClosingTag(node);
      contentContainer.setAttribute(
        "class",
        "px-3 w-full border-gray-300 dark:border-gray-700 border-l-2 ml-1 py-[2px] content"
      );
      dom.setAttribute("class", "flex flex-col justify-center items-center relative w-full");
      dom.setAttribute("data-element", "true");
      content.setAttribute("class", "relative content");
      contentContainer.append(content);
      dom.append(code, contentContainer, bottomCode);
      code.setAttribute(
        "class",
        "!whitespace-pre-wrap leading-[26px] min-h-6.5 block w-full !p-0 !bg-transparent !rounded-0 !text-gray-400 !dark:text-gray-400 cursor-pointer"
      );
      bottomCode.setAttribute(
        "class",
        "block w-full !p-0 leading-[26px] min-h-6.5 !rounded-0 !bg-transparent !text-gray-400 !dark:text-gray-400 cursor-pointer select-none"
      );
      code.contentEditable = "false";
      bottomCode.contentEditable = "false";
      bottomCode.append(bottomCodeStart, bottomCodeKey, bottomCodeEnd);
      bottomCodeStart.textContent = "</";
      bottomCodeEnd.textContent = ">";
      code.addEventListener("click", handleCodeClick);
      bottomCode.addEventListener("click", handleCodeClick);

      if (!node.content.size) {
        bottomCode.classList.add("!hidden");
      }

      const update = (): void => {
        const pos = typeof props.getPos === "function" ? props.getPos() : null;
        const { selection } = this.editor.state;
        const selectionPos = selection.$from.pos;

        if (pos === null) return;

        if (
          pos === selectionPos &&
          isElementSelection(selection) &&
          isElementSelectionActive(selection)
        ) {
          code.classList.add("selected-element-code");
          bottomCodeKey.classList.add("selected-element-bottom-code");
          bottomCode.classList.remove("!text-gray-400", "!dark:text-gray-400");
          bottomCode.classList.add("!text-[#000000]", "!dark:text-[#DCDCDC]");
          bottomCodeKey.classList.add("!text-[#008080]", "!dark:text-[#3dc9b0]");
        } else if (isElementSelection(selection) && !isElementSelectionActive(selection)) {
          contentContainer.classList.add("!border-primary");
          code.classList.remove("selected-element-code");
          bottomCodeKey.classList.remove("selected-element-bottom-code");
          bottomCode.classList.add("!text-gray-400", "!dark:text-gray-400");
          bottomCode.classList.remove("!text-[#000000]", "!dark:text-[#DCDCDC]");
          bottomCodeKey.classList.remove("!text-[#008080]", "!dark:text-[#3dc9b0]");
        } else {
          contentContainer.classList.remove("!border-primary");
          code.classList.remove("selected-element-code");
          bottomCodeKey.classList.remove("selected-element-bottom-code");
          bottomCode.classList.add("!text-gray-400", "!dark:text-gray-400");
          bottomCode.classList.remove("!text-[#000000]", "!dark:text-[#DCDCDC]");
          bottomCodeKey.classList.remove("!text-[#008080]", "!dark:text-[#3dc9b0]");
        }
      };

      return {
        dom,
        contentDOM: content,
        ignoreMutation(mutation: MutationRecord | { type: "selection"; target: Element }) {
          if (mutation.type === "selection") {
            return true;
          }

          return referenceView.ignoreMutation(mutation);
        },
        selectNode() {
          editor.on("update", update);
          editor.on("selectionUpdate", update);
        },
        deselectNode() {
          update();
          editor.off("update", update);
          editor.off("selectionUpdate", update);
        },
        stopEvent(event) {
          return referenceView.stopEvent(event);
        },
        update(newNode) {
          if (newNode.type.name !== "element") return false;
          if (newNode.attrs.type !== node.attrs.type) return false;

          node = newNode as Node;
          getOpeningTag(node).then((openingTag) => (code.textContent = openingTag));
          bottomCodeKey.textContent = getClosingTag(node);

          if (node.content.size) {
            bottomCode.classList.remove("!hidden");
          } else {
            bottomCode.classList.add("!hidden");
          }

          return true;
        }
      };
    };
  }
});

export { Element };
export type { ElementAttributes };
