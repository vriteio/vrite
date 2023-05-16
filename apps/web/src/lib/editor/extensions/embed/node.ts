import { EmbedView } from "./view";
import { SolidNodeViewRenderer } from "@vrite/tiptap-solid";
import { Command, Node } from "@tiptap/core";
import { EmbedType } from "#lib/utils";

interface EmbedAttributes {
  embed?: EmbedType;
  input?: string;
  src?: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embed: {
      insertEmbed: (attrs: EmbedAttributes) => ReturnType;
      updateEmbed: (attrs: EmbedAttributes) => ReturnType;
      removeEmbed: () => ReturnType;
    };
  }
}

const Embed = Node.create({
  name: "embed",
  atom: true,
  draggable: true,
  selectable: true,
  inline: false,
  group: "block",
  addAttributes() {
    return {
      embed: {
        default: null
      },
      input: { default: null },
      src: {
        default: null
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "iframe",
        getAttrs(dom) {
          const element = dom as HTMLElement;

          return {
            src: element.getAttribute("src"),
            embed: element.getAttribute("data-embed"),
            input: element.getAttribute("data-input")
          };
        }
      }
    ];
  },
  renderHTML({ node }) {
    return [
      "iframe",
      {
        "src": node.attrs.src,
        "data-embed": node.attrs.embed
      }
    ];
  },
  addNodeView() {
    return SolidNodeViewRenderer(EmbedView);
  },
  addCommands() {
    return {
      insertEmbed: (attributes?: { embed?: EmbedType }): Command => {
        return ({ dispatch, tr }) => {
          const { selection } = tr;
          const node = this.type.create(attributes);

          if (dispatch) {
            tr.replaceRangeWith(selection.from, selection.to, node);
          }

          return true;
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
  }
});

export { Embed };
export type { EmbedAttributes };
