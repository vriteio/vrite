import { isElementSelection, isElementSelectionActive } from "./selection";
import { NodeView, NodeViewRendererProps } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { NodeView as PMNodeView } from "@tiptap/pm/view";
import { SolidEditor } from "@vrite/tiptap-solid";
import { wrap } from "module";
import { formatCode } from "#lib/code-editor";

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
const xmlNodeView = ({
  props,
  editor,
  wrapper,
  contentWrapper
}: {
  props: NodeViewRendererProps;
  editor: SolidEditor;
  wrapper: HTMLElement;
  contentWrapper: HTMLElement;
}): Partial<PMNodeView> => {
  const referenceView = new NodeView(() => {}, props);

  let node = props.node as PMNode;

  const contentContainer = document.createElement("div");
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
  wrapper.setAttribute("class", "flex flex-col justify-center items-center relative w-full");
  contentWrapper.setAttribute("class", "relative content");
  contentContainer.append(contentWrapper);
  wrapper.append(code, contentContainer, bottomCode);
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
    const { selection } = editor.state;
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
    selectNode() {
      editor.on("update", update);
      editor.on("selectionUpdate", update);
    },
    deselectNode() {
      update();
      editor.off("update", update);
      editor.off("selectionUpdate", update);
    },
    update(newNode) {
      if (newNode.type.name !== "element") return false;
      if (newNode.attrs.type !== node.attrs.type) return false;

      node = newNode;
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

export { xmlNodeView };
