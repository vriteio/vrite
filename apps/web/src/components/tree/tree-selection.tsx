import { createMemo, For } from "solid-js";
import { useTree } from "./tree-context";

const TreeSelection = () => {
  const [{ selection, flattenedLayout }] = useTree();
  const selectionBlocks = createMemo(() => {
    const layout = flattenedLayout();
    const sel = selection();
    const blocks: Array<{ top: number; height: number }> = [];
    let currentBlock: { top: number; height: number } | null = null;

    layout.forEach((item) => {
      if (sel.includes(item.id)) {
        if (!currentBlock) {
          currentBlock = { top: item.top, height: 0 };
          blocks.push(currentBlock);
        }

        currentBlock.height = item.top + item.height - currentBlock.top;
      } else {
        currentBlock = null;
      }
    });

    return blocks;
  });

  return (
    <For each={selectionBlocks()}>
      {(selectionBlock) => (
        <div
          class="absolute bg-gradient-to-r opacity-10 from-secondary via-primary to-transparent w-full left-0 -z-10 rounded-lg"
          style={{
            top: `${selectionBlock.top}px`,
            height: `${selectionBlock.height}px`
          }}
        />
      )}
    </For>
  );
};

export { TreeSelection };
