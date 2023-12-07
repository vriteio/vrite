import { Extension } from "@tiptap/core";
import { NodeType, Node as ProsemirrorNode } from "@tiptap/pm/model";
import { PluginKey, Plugin } from "@tiptap/pm/state";

const nodeEqualsType = (node: ProsemirrorNode, types: NodeType | NodeType[]): boolean => {
  return Array.isArray(types) ? types.includes(node.type) : node.type === types;
};

interface TrailingNodeOptions {
  node: string;
  notAfter: string[];
}

const TrailingNode = Extension.create<TrailingNodeOptions>({
  name: "trailingNode",

  addOptions() {
    return {
      node: "paragraph",
      notAfter: ["paragraph"]
    };
  },

  addProseMirrorPlugins() {
    const plugin = new PluginKey(this.name);
    const disabledNodes = Object.entries(this.editor.schema.nodes)
      .map(([, value]) => value)
      .filter((node) => this.options.notAfter.includes(node.name));

    return [
      new Plugin({
        key: plugin,
        appendTransaction: (_, __, state) => {
          const { doc, tr, schema } = state;
          const shouldInsertNodeAtEnd = plugin.getState(state);
          const endPosition = doc.content.size;
          const type = schema.nodes[this.options.node];

          if (!shouldInsertNodeAtEnd) {
            return;
          }

          return tr.insert(endPosition, type.create());
        },
        state: {
          init: (_, state) => {
            const lastNode = state.tr.doc.lastChild;

            return lastNode ? !nodeEqualsType(lastNode, disabledNodes) : false;
          },
          apply: (tr, value) => {
            if (!tr.docChanged) {
              return value;
            }

            const lastNode = tr.doc.lastChild;

            return lastNode ? !nodeEqualsType(lastNode, disabledNodes) : false;
          }
        }
      })
    ];
  }
});

export { TrailingNode };
export type { TrailingNodeOptions };
