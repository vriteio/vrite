import { Mark, mergeAttributes } from "@tiptap/core";

interface CommentOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comment: {
      setComment: (attributes: { thread?: string | null }) => ReturnType;
      toggleComment: (attributes: { thread?: string | null }) => ReturnType;
      unsetComment: () => ReturnType;
    };
  }
}

const Comment = Mark.create<CommentOptions>({
  name: "comment",
  exitable: true,
  addOptions() {
    return {
      HTMLAttributes: {}
    };
  },
  addAttributes() {
    return {
      thread: {
        default: null,
        parseHTML: (el) => (el as HTMLSpanElement).getAttribute("data-thread"),
        renderHTML: (attrs) => ({ "data-thread": attrs.thread })
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-thread]",
        getAttrs: (el) => !!(el as HTMLSpanElement).getAttribute("data-thread")?.trim() && null
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { "data-comment": true }),
      0
    ];
  },
  addCommands() {
    return {
      setComment: (attributes) => {
        return ({ commands }) => commands.setMark("comment", attributes);
      },
      toggleComment: (attributes) => {
        return ({ commands }) => {
          return commands.toggleMark("comment", attributes);
        };
      },
      unsetComment: () => {
        return ({ commands }) => {
          return commands.unsetMark("comment");
        };
      }
    };
  }
});

export { Comment };
