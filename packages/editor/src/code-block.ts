import { Node, mergeAttributes } from "@tiptap/core";
import { nodeInputRule } from "./node-input-rule";

interface CodeBlockAttributes {
  lang?: string;
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
          const classNames = [...(element.firstElementChild?.classList || [])];
          const languages = classNames
            .filter((className) => className.startsWith("language-"))
            .map((className) => className.replace("language-", ""));
          const language = languages[0];

          if (!language) {
            return null;
          }

          return language.toLowerCase();
        },
        rendered: false
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
          class: node.attrs.lang ? `language-${node.attrs.lang}` : null
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
