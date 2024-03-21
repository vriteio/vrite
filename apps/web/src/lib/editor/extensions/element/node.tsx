import { ElementSelection, isElementSelection, isElementSelectionActive } from "./selection";
import { Element as BaseElement, ElementAttributes } from "@vrite/editor";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { NodeView } from "@tiptap/core";
import { keymap } from "@tiptap/pm/keymap";
import { Node } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { Node as PMNode } from "@tiptap/pm/model";
import { formatCode } from "#lib/code-editor";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    element: {
      setElementSelection: (position: number, active?: boolean) => ReturnType;
    };
  }
}

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
const Element = BaseElement.extend({
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
      const referenceView = new NodeView(() => {}, props);

      let node = props.node as Node;

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
      dom.setAttribute("class", "flex flex-col justify-center items-center relative");
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
