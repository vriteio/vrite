import { nodeInputRule } from "./node-input-rule";
import { Node, mergeAttributes } from "@tiptap/core";

interface CodeBlockAttributes {
  lang?: string;
  title?: string;
  meta?: string;
  startLine?: number;
}
interface CodeBlockOptions {
  inline: boolean;
  HTMLAttributes: CodeBlockAttributes;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    codeBlock: {
      insertCodeBlock: (attrs: CodeBlockAttributes) => ReturnType;
      updateCodeBlock: (attrs: CodeBlockAttributes) => ReturnType;
      removeCodeBlock: () => ReturnType;
    };
  }
}

const CodeBlock = Node.create<CodeBlockOptions>({
  name: "codeBlock",
  content: "text*",
  marks: "",
  group: "block",
  code: true,
  atom: true,
  isolating: true,
  defining: true,
  selectable: true,
  addOptions() {
    return {
      inline: false,
      HTMLAttributes: {}
    };
  },
  addAttributes() {
    return {
      lang: {
        default: null,
        parseHTML: (element) => {
          // Class name access must be supported by zeed-dom for server-side processing
          const classNames = [...(element.children[0]?.className.split(" ") || [])];
          const languages = classNames
            .filter((className) => className.startsWith("language-"))
            .map((className) => className.replace("language-", ""));
          const [language] = languages;

          if (!language) {
            return null;
          }

          return language.toLowerCase();
        },
        rendered: false
      },
      title: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("data-title");
        }
      },
      startLine: {
        default: 1,
        parseHTML: (element) => {
          const value = parseInt(element.getAttribute("data-start-line") || "1");

          if (!value || isNaN(value)) {
            return 1;
          }

          return value;
        }
      },
      meta: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("data-meta");
        }
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "pre",
        preserveWhitespace: "full"
      }
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      [
        "code",
        {
          "class": node.attrs.lang ? `language-${node.attrs.lang}` : null,
          "data-start-line": `${node.attrs.startLine}`,
          "data-title": node.attrs.title,
          "data-meta": node.attrs.meta
        },
        0
      ]
    ];
  },
  addCommands() {
    return {
      insertCodeBlock: (attrs) => {
        return ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs
          });
        };
      },
      updateCodeBlock: (attrs) => {
        return ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        };
      },
      removeCodeBlock: () => {
        return ({ commands }) => {
          return commands.deleteNode(this.name);
        };
      }
    };
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: /(^```(.*?)\s$)/,
        type: this.type,
        getAttributes: (match) => {
          const [, , lang] = match;

          return { lang };
        }
      })
    ];
  }
});

export { CodeBlock };
export type { CodeBlockAttributes, CodeBlockOptions };
