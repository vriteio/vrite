import {
  ExtendedRegExpMatchArray,
  Node,
  mergeAttributes,
  nodeInputRule,
  wrappingInputRule
} from "@tiptap/core";

interface ElementAttributes {
  type?: string;
  props: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    Element: {
      setElement: (attrs?: ElementAttributes) => ReturnType;
      toggleElement: (attrs?: ElementAttributes) => ReturnType;
      unsetElement: () => ReturnType;
    };
  }
}

const Element = Node.create({
  name: "element",
  content: "block*",
  group: "block",
  isolating: true,
  defining: true,
  selectable: true,
  atom: true,
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
        tag: "div[data-type]"
      }
    ];
  },
  renderHTML({ node }) {
    return [
      "div",
      mergeAttributes({
        "data-element": "true",
        "data-type": node.attrs.type,
        "data-props": JSON.stringify(node.attrs.props)
      }),
      0
    ];
  },
  addCommands() {
    return {
      setElement: (attrs) => {
        return ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              type: "Element",
              props: {},
              ...attrs
            }
          });
        };
      },
      toggleElement: (attrs) => {
        return ({ commands }) => {
          return commands.toggleWrap(this.name, attrs);
        };
      },
      unsetElement: () => {
        return ({ commands }) => {
          return commands.lift(this.name);
        };
      }
    };
  },
  addInputRules() {
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
      nodeInputRule({
        find: /^<.*?.+?\/>$/,
        type: this.type,
        getAttributes
      }),
      wrappingInputRule({
        find: /^<.*?.+?>$/,
        type: this.type,
        joinPredicate: () => false,
        getAttributes
      })
    ];
  }
});

export { Element };
export type { ElementAttributes };
