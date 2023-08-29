import { nodeInputRule } from "./node-input-rule";
import { Node, mergeAttributes } from "@tiptap/core";

interface ImageAttributes {
  src?: string;
  alt?: string;
  width?: string;
  aspectRatio?: string;
}
interface ImageOptions {
  inline: boolean;
  cover: boolean;
  HTMLAttributes: ImageAttributes;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      insertImage: (attrs: ImageAttributes) => ReturnType;
      updateImage: (attrs: ImageAttributes) => ReturnType;
      removeImage: () => ReturnType;
    };
  }
}

const Image = Node.create<ImageOptions>({
  name: "image",
  addOptions() {
    return {
      inline: false,
      cover: false,
      HTMLAttributes: {}
    };
  },
  inline() {
    return this.options.inline;
  },
  group() {
    return this.options.inline ? "inline" : "block";
  },
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute("data-src") || element.getAttribute("src");
        }
      },
      alt: {
        default: null
      },
      width: {
        default: null
      },
      aspectRatio: {
        default: null
      },
      uploading: {
        default: null
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "img[src]"
      }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },
  addCommands() {
    return {
      insertImage: (attrs) => {
        return ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs
          });
        };
      },
      updateImage: (attrs) => {
        return ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        };
      },
      removeImage: () => {
        return ({ commands }) => {
          return commands.deleteNode(this.name);
        };
      }
    };
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: /(^!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)$)/,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, src] = match;

          return { src, alt };
        }
      })
    ];
  }
});

export { Image };
export type { ImageAttributes, ImageOptions };
