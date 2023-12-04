import {
  Editor,
  ExtendedRegExpMatchArray,
  Node,
  NodeView,
  markInputRule,
  mergeAttributes,
  nodeInputRule,
  wrappingInputRule
} from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";

interface InlineElementAttributes {
  type?: string;
  props: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    InlineElement: {
      setInlineElement: (attrs?: InlineElementAttributes) => ReturnType;
      toggleInlineElement: (attrs?: InlineElementAttributes) => ReturnType;
      unsetInlineElement: () => ReturnType;
    };
  }
}

const getOpeningTag = (node: PMNode): string => {
  const keyValueProps = Object.entries(node.attrs.props).map(([key, value]) => {
    if (value === true) return key;

    const useBrackets = typeof value !== "string" || value.includes("\n") || value.includes(`"`);

    return `${key}=${useBrackets ? "{" : ""}${JSON.stringify(value)}${useBrackets ? "}" : ""}`;
  });
  const c = `<${node.attrs.type}${keyValueProps.length ? " " : ""}${keyValueProps.join(" ")}>`;
  const codeTagClosed = c.trim().replace(/>$/, "/>") || "";
  const formattedCode = codeTagClosed;

  return formattedCode.replace(/ *?\/>;/gm, node.content.size ? ">" : "/>").trim();
};
const getClosingTag = (node: PMNode): string => node.attrs.type;
const InlineElement = Node.create({
  name: "inlineElement",
  content: "inline*",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,
  isolating: true,
  defining: true,
  addAttributes() {
    return {
      props: {
        default: {},
        parseHTML: (element) => {
          return JSON.parse(element.getAttribute("data-props") || "{}");
        }
      },
      type: {
        default: "Element",
        parseHTML: (element) => {
          return element.getAttribute("data-type");
        }
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-element=true]"
      }
    ];
  },
  renderHTML({ node }) {
    return [
      "span",
      mergeAttributes({
        "data-element": "true",
        "data-type": node.attrs.type,
        "data-props": JSON.stringify(node.attrs.props),
        "style": "display: inline-flex;"
      }),
      [
        "span",
        {
          contentEditable: false,
          class:
            "!whitespace-pre-wrap w-full !text-gray-400 !dark:text-gray-400 cursor-pointer pointer-events-none select-none font-mono"
        },
        `<${node.attrs.type}>`
      ],
      ["span", {}, 0],
      [
        "span",
        {
          contentEditable: "false",
          class:
            "!whitespace-pre-wrap w-full !text-gray-400 !dark:text-gray-400 cursor-pointer pointer-events-none select-none font-mono"
        },
        `</${node.attrs.type}>`
      ]
    ];
  },
  /*addNodeView() {
    return (props) => {
      let node = props.node as PMNode;

      const referenceView = new NodeView(() => {}, props);
      const container = document.createElement("span");
      const codeStart = document.createElement("span");
      const codeEnd = document.createElement("span");
      const content = document.createElement("span");

      container.setAttribute("style", "display: inline-flex;");
      codeStart.setAttribute(
        "class",
        "!whitespace-pre-wrap w-full !text-gray-400 !dark:text-gray-400 cursor-pointer pointer-events-none select-none font-mono"
      );
      codeEnd.setAttribute(
        "class",
        "!whitespace-pre-wrap w-full !text-gray-400 !dark:text-gray-400 cursor-pointer pointer-events-none select-none font-mono"
      );
      codeStart.setAttribute("contenteditable", "false");
      codeEnd.setAttribute("contenteditable", "false");
      codeStart.textContent = `<${node.attrs.type}>`;
      codeEnd.textContent = `</${node.attrs.type}>`;
      container.append(codeStart, content, codeEnd);

      return {
        dom: container,
        contentDOM: content,
        ignoreMutation(mutation: MutationRecord | { type: "selection"; target: Element }) {
          if (mutation.type === "selection") {
            return true;
          }

          return referenceView.ignoreMutation(mutation);
        },
        stopEvent(event) {
          return referenceView.stopEvent(event);
        },
        update(newNode) {
          if (newNode.type.name !== "element") return false;

          node = newNode as PMNode;

          return true;
        }
      };
    };
  },*/
  addCommands() {
    return {
      setInlineElement: (attrs) => {
        return ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              type: "Element",
              props: {},
              ...attrs
            },
            content: [
              {
                type: "text",
                text: " "
              }
            ]
          });
        };
      },
      toggleInlineElement: (attrs) => {
        return ({ commands }) => {
          return commands.toggleWrap(this.name, attrs);
        };
      },
      unsetInlineElement: () => {
        return ({ commands }) => {
          return commands.lift(this.name);
        };
      }
    };
  },
  addInputRules() {
    /*const getAttributes = (input: ExtendedRegExpMatchArray): Record<string, any> => {
      const tag = input[1].trim();

      if (tag && tag !== "undefined") {
        return { type: tag, props: {} };
      }

      return {};
    };*/
    const getAttributes = (input: ExtendedRegExpMatchArray): Record<string, any> => {
      const [code] = input;
      const tagRegex = /^<(\w+?)(?:\s|\n|\/|>)/;
      const [, tag] = tagRegex.exec(code.trim()) || [];

      if (tag && tag !== "undefined") {
        return { type: tag, props: {} };
      }

      return {};
    };

    return [
      /*nodeInputRule({
        find: /(?:<(.+?)>)((?:.+))(?:<\/\1>)$/,
        type: this.type,
        getAttributes
      }),*/
      wrappingInputRule({
        find: /^<.*?.+?>$/,
        type: this.type,
        joinPredicate: () => false,
        getAttributes
      })
    ];
  }
});

export { InlineElement };
export type { InlineElementAttributes };
