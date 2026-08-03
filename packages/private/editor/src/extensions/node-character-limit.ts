import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";

interface NodeCharacterLimitOptions {
  limits: Record<string, number | null | undefined>;
  textCounter(text: string): number;
}

interface LimitedNode {
  length: number;
  limit: number;
  node: ProseMirrorNode;
  pos: number;
}

const getLimitedNodes = (
  document: ProseMirrorNode,
  options: NodeCharacterLimitOptions
): LimitedNode[] => {
  const nodes: LimitedNode[] = [];

  document.descendants((node, pos) => {
    const limit = options.limits[node.type.name];

    if (!limit || limit < 0) return;

    nodes.push({
      length: options.textCounter(node.textBetween(0, node.content.size, undefined, " ")),
      limit,
      node,
      pos
    });
  });

  return nodes;
};

const getViolations = (
  transaction: Transaction,
  state: EditorState,
  options: NodeCharacterLimitOptions
) => {
  const inverseMapping = transaction.mapping.invert();

  return getLimitedNodes(transaction.doc, options).filter((limitedNode) => {
    if (limitedNode.length <= limitedNode.limit) return false;

    const oldPos = inverseMapping.map(limitedNode.pos, -1);
    const oldNode = state.doc.nodeAt(oldPos);

    if (oldNode?.type !== limitedNode.node.type) return true;

    const oldLength = options.textCounter(
      oldNode.textBetween(0, oldNode.content.size, undefined, " ")
    );

    return oldLength <= limitedNode.limit || limitedNode.length > oldLength;
  });
};

const NodeCharacterLimit = Extension.create<NodeCharacterLimitOptions>({
  name: "nodeCharacterLimit",
  addOptions() {
    return {
      limits: {},
      textCounter: (text) => text.length
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("nodeCharacterLimit"),
        filterTransaction: (transaction, state) => {
          if (!transaction.docChanged) return true;

          const violations = getViolations(transaction, state, this.options);

          if (violations.length === 0) return true;
          if (!transaction.getMeta("paste") || violations.length > 1) return false;

          const [violation] = violations;
          const to = transaction.selection.$head.pos;
          const contentStart = violation.pos + 1;
          const contentEnd = violation.pos + violation.node.nodeSize - 1;

          if (to < contentStart || to > contentEnd) return false;

          const excess = violation.length - violation.limit;
          const from = Math.max(contentStart, to - excess);

          transaction.deleteRange(from, to);

          return getViolations(transaction, state, this.options).length === 0;
        }
      })
    ];
  }
});

export { NodeCharacterLimit };
export type { NodeCharacterLimitOptions };
