import { PluginKey, type EditorState } from "@tiptap/pm/state";
import type { DecorationSet } from "@tiptap/pm/view";

interface SeparatorState {
  baseDecorations: DecorationSet;
  decorations: DecorationSet;
  splitPos: number | null;
}

const separatorPluginKey = new PluginKey<SeparatorState>("separator");
const getActiveFragmentSplitPos = (state: EditorState): number | null => {
  return separatorPluginKey.getState(state)?.splitPos ?? null;
};

export { getActiveFragmentSplitPos, separatorPluginKey };
export type { SeparatorState };
