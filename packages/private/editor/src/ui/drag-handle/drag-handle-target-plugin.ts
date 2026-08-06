import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DecorationSet, Decoration } from "@tiptap/pm/view";

const dragHandleTargetPluginKey = new PluginKey<number | null>("dragHandleTarget");
const DragHandleTargetPlugin = () => {
  return new Plugin<number | null>({
    key: dragHandleTargetPluginKey,
    state: {
      init: () => null,
      apply(transaction, targetPos) {
        const meta = transaction.getMeta(dragHandleTargetPluginKey) as
          { pos: number | null } | undefined;

        if (meta) return meta.pos;
        if (targetPos === null) return null;

        const mapped = transaction.mapping.mapResult(targetPos);

        return mapped.deleted ? null : mapped.pos;
      }
    },
    props: {
      decorations(state) {
        const pos = dragHandleTargetPluginKey.getState(state);

        if (typeof pos !== "number") return DecorationSet.empty;

        const node = state.doc.nodeAt(pos);

        if (!node || node.type.name !== "heading") return DecorationSet.empty;

        return DecorationSet.create(state.doc, [
          Decoration.node(pos, pos + node.nodeSize, { "data-drag-handle-target": "" })
        ]);
      }
    }
  });
};

export { DragHandleTargetPlugin, dragHandleTargetPluginKey };
