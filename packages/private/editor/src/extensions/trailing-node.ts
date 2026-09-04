import { Extension } from "@tiptap/core";
import { type NodeType, type Node as ProsemirrorNode } from "@tiptap/pm/model";
import { PluginKey, Plugin } from "@tiptap/pm/state";
import type { EditorMode } from "#editor/client-types";

const nodeEqualsType = (node: ProsemirrorNode, types: NodeType | NodeType[]): boolean => {
  return Array.isArray(types) ? types.includes(node.type) : node.type === types;
};
interface TrailingNodeOptions {
  mode: EditorMode;
  node: string;
  notAfter: string[];
}

type TrailingNodeAction = "insert" | "remove" | null;

const hasSchemaFields = (document: ProsemirrorNode): boolean => {
  let schemaFields = false;

  document.forEach((node) => {
    if (
      (node.type.name === "fragment" || node.type.name === "property") &&
      typeof node.attrs.schemaFieldID === "string"
    ) {
      schemaFields = true;
    }
  });

  return schemaFields;
};
const getTrailingNodeAction = (
  document: ProsemirrorNode,
  disabledNodes: NodeType[],
  mode: EditorMode
): TrailingNodeAction => {
  const lastNode = document.lastChild;

  if (mode === "schema") {
    return lastNode?.type.name === "paragraph" ? null : "insert";
  }

  if (hasSchemaFields(document)) {
    return lastNode?.type.name === "paragraph" && lastNode.content.size === 0 ? "remove" : null;
  }

  return lastNode && nodeEqualsType(lastNode, disabledNodes) ? null : "insert";
};

const TrailingNode = Extension.create<TrailingNodeOptions>({
  name: "trailingNode",

  addOptions() {
    return {
      mode: "entry",
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
        appendTransaction: (_trs, _oldState, state) => {
          const { doc, tr, schema } = state;
          const action = plugin.getState(state) as TrailingNodeAction;
          const endPosition = doc.content.size;
          const type = schema.nodes[this.options.node];

          if (action === "insert") {
            return tr.insert(endPosition, type.createAndFill()!);
          }

          if (action === "remove" && doc.lastChild) {
            return tr.delete(endPosition - doc.lastChild.nodeSize, endPosition);
          }

          return;
        },
        state: {
          init: (_config, state) =>
            getTrailingNodeAction(state.doc, disabledNodes, this.options.mode),
          apply: (tr, value) => {
            if (!tr.docChanged) return value;

            return getTrailingNodeAction(tr.doc, disabledNodes, this.options.mode);
          }
        }
      })
    ];
  }
});

export { TrailingNode };
export type { TrailingNodeOptions };
