import { ImageView } from "./view";
import { SolidNodeViewRenderer } from "@vrite/tiptap-solid";
import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { createSignal } from "solid-js";
import { useClientContext } from "#context";
import { nodeInputRule } from "#lib/editor";

interface ImageAttributes {
  src?: string;
  alt?: string;
  width?: string;
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

const inputRegex = /(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))/;
const Image = Node.create<ImageOptions>({
  name: "image",
  addOptions() {
    return {
      inline: false,
      cover: false,
      HTMLAttributes: {}
    };
  },
  addStorage() {
    const [droppedFile, setDroppedFile] = createSignal<File | null>(null);

    return {
      droppedFile,
      setDroppedFile
    };
  },
  inline() {
    return this.options.inline;
  },
  group() {
    return this.options.inline ? "inline" : "block";
  },
  draggable: true,
  addAttributes() {
    return {
      src: {
        default: null
      },
      alt: {
        default: null
      },
      width: {
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
  addNodeView() {
    return SolidNodeViewRenderer(ImageView);
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
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, src] = match;

          return { src, alt };
        }
      })
    ];
  },

  addProseMirrorPlugins() {
    const { client } = useClientContext();

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            drop: (view, event) => {
              const hasFiles =
                event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length;

              if (!hasFiles) {
                return false;
              }

              const [image] = [...(event.dataTransfer as DataTransfer).files].filter((file) => {
                const regex = /image/i;

                return regex.test(file.type);
              });

              if (!image) {
                return false;
              }

              event.preventDefault();

              const { schema } = view.state;
              const coordinates = view.posAtCoords({
                left: event.clientX,
                top: event.clientY
              });

              if (coordinates) {
                this.storage.setDroppedFile(image);

                const node = schema.nodes.image.create();
                const transaction = view.state.tr.insert(coordinates.pos, node);

                view.dispatch(transaction);
              }

              return true;
            }
          }
        }
      })
    ];
  }
});

export { Image };
export type { ImageAttributes, ImageOptions };
