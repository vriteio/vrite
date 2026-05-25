import { NodeViewContent, NodeViewWrapper } from "@andesine/tiptap-solid";
import clsx from "clsx";

const FragmentView = () => {
  return (
    <NodeViewWrapper>
      <div class="flex gap-2 items-center w-full h-9" contentEditable={false}>
        <div class="flex flex-col">
          <div class="flex gap-1 items-center font-medium min-h-7">
            <div class="relative">
              <div
                class={clsx("h-5 w-5 bg-gradient-to-tr", {
                  "i-lucide:letter-text": true
                })}
              />
            </div>
            Content
          </div>
        </div>
        <div class="flex-1 bg-gray-200 h-px rounded-full" />
      </div>
      <NodeViewContent />
    </NodeViewWrapper>
  );
};

export { FragmentView };
