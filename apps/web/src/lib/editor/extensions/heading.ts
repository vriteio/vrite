import { mergeAttributes, Node, textblockTypeInputRule } from "@tiptap/core";
import { nodePasteRule } from "./node-paste-rule";

type Level = 1 | 2 | 3 | 4 | 5 | 6;
interface HeadingOptions {
  levels: Level[];
  enabledLevels: Level[];
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    heading: {
      setHeading: (attributes: { level: Level }) => ReturnType;
      toggleHeading: (attributes: { level: Level }) => ReturnType;
    };
  }
}

const Heading = Node.create<HeadingOptions>({
  name: "heading",

  addOptions() {
    return {
      levels: [1, 2, 3, 4, 5, 6],
      enabledLevels: [1, 2, 3, 4, 5, 6],
      HTMLAttributes: {}
    };
  },

  content: "inline*",

  group: "block",

  defining: true,

  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: false
      }
    };
  },

  parseHTML() {
    return this.options.levels.map((level: Level) => ({
      tag: `h${level}`,
      attrs: { level }
    }));
  },

  renderHTML({ node, HTMLAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level = hasLevel ? node.attrs.level : this.options.levels[0];

    return [`h${level}`, mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setHeading: (attributes) => {
        return ({ commands }) => {
          if (!this.options.enabledLevels.includes(attributes.level)) {
            return false;
          }

          return commands.setNode(this.name, attributes);
        };
      },
      toggleHeading: (attributes) => {
        return ({ commands }) => {
          if (!this.options.enabledLevels.includes(attributes.level)) {
            return false;
          }

          return commands.toggleNode(this.name, "paragraph", attributes);
        };
      }
    };
  },

  addKeyboardShortcuts() {
    return this.options.enabledLevels.reduce(
      (items, level) => ({
        ...items,
        ...{
          [`Mod-Alt-${level}`]: () => this.editor.commands.toggleHeading({ level })
        }
      }),
      {}
    );
  },

  addInputRules() {
    return this.options.enabledLevels.map((level) => {
      return textblockTypeInputRule({
        find: new RegExp(`^(#{${level}})\\s$`),
        type: this.type,
        getAttributes: {
          level
        }
      });
    });
  },

  addPasteRules() {
    return this.options.enabledLevels.map((level) => {
      return nodePasteRule({
        find: new RegExp(`^#{${level}}\\s(.*)`, "g"),
        type: this.type,
        getAttributes() {
          return {
            level
          };
        },
        getContent(match) {
          return match[1];
        }
      });
    });
  }
});

export { Heading };
export type { HeadingOptions, Level };
