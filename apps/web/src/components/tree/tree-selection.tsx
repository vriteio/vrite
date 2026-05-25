import { createMemo, For } from "solid-js";
import { useTree } from "./tree-context";

const TreeSelection = () => {
  const [{ selection, flattenedOrder, itemHeight }] = useTree();
  const selectionBlocks = createMemo(() => {
    const order = flattenedOrder();
    const sel = selection();
    const blocks: Array<{ startIndex: number; length: number }> = [];
    let currentBlock: { startIndex: number; length: number } | null = null;

    order.forEach((id, index) => {
      if (sel.includes(id)) {
        if (!currentBlock) {
          currentBlock = { startIndex: index, length: 0 };
          blocks.push(currentBlock);
        }

        currentBlock.length++;
      } else {
        currentBlock = null;
      }
    });

    return blocks;
  });

  return (
    <For each={selectionBlocks()}>
      {(selectionBlock) => {
        return (
          <div
            class="absolute bg-gradient-to-r opacity-10 from-secondary via-primary to-transparent w-full left-0 -z-10 rounded-lg"
            style={{
              top: `${selectionBlock.startIndex * itemHeight}px`,
              height: `${selectionBlock.length * itemHeight}px`
            }}
          />
        );
      }}
    </For>
  );
};

export { TreeSelection };
