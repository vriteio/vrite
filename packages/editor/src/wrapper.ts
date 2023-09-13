import { nodeInputRule } from "./node-input-rule";
import { Node, mergeAttributes, wrappingInputRule } from "@tiptap/core";

interface WrapperAttributes {
  name?: string;
}
interface WrapperOptions {
  HTMLAttributes: WrapperAttributes;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wrapper: {
      setWrapper: (attrs?: WrapperAttributes) => ReturnType;
      toggleWrapper: (attrs?: WrapperAttributes) => ReturnType;
      unsetWrapper: () => ReturnType;
    };
  }
}

const Wrapper = Node.create<WrapperOptions>({
  name: "wrapper",
  content: "block+",
  group: "block",
  isolating: true,
  defining: true,
  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },
  addAttributes() {
    return {
      key: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("data-key");
        }
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-wrapper=true]"
      }
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-wrapper": "true",
        "data-key": node.attrs.key
      }),
      0
    ];
  },
  addCommands() {
    return {
      setWrapper: (attrs) => {
        return ({ commands }) => {
          return commands.wrapIn(this.name, attrs);
        };
      },
      toggleWrapper: (attrs) => {
        return ({ commands }) => {
          return commands.toggleWrap(this.name, attrs);
        };
      },
      unsetWrapper: () => {
        return ({ commands }) => {
          return commands.lift(this.name);
        };
      }
    };
  },
  addInputRules() {
    return [
      wrappingInputRule({
        find: /(^:::(.*?)\s$)/,
        type: this.type,
        getAttributes: (match) => {
          const [, , key] = match;

          return { key: key.trim() };
        }
      })
    ];
  }
});

export { Wrapper };
export type { WrapperAttributes, WrapperOptions };
