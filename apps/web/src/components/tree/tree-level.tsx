import clsx from "clsx";
import { Accessor, Component, For, JSX, Show } from "solid-js";
import { TreeMap, useTree } from "./tree-context";

interface TreeLevelProps {
  levelID: string;
  tree: Accessor<TreeMap>;
  renderLevel: (levelID: string) => JSX.Element;
  renderItem: (itemID: string, index: number) => JSX.Element;
  emptyMessage?: string;
}

const TreeLevel: Component<TreeLevelProps> = (props) => {
  const [{ isSelected, isExpanded }] = useTree();
  const isRoot = () => props.levelID === "*";
  const levelData = () => props.tree()[props.levelID];
  const childLevelIDs = () => levelData()?.levels || [];
  const childItemIDs = () => levelData()?.items || [];

  return (
    <Show when={isRoot() || isExpanded(props.levelID)}>
      <Show when={!isRoot()}>
        <div class="flex">
          <div class="min-w-3.5 pl-0.5 flex justify-end items-center">
            <div
              class={clsx(
                "h-full w-px rounded-full bg-gray-300 dark:border-gray-600",
                isSelected(props.levelID) && "bg-gradient-to-b"
              )}
            />
          </div>
          <div class="flex flex-col flex-1 overflow-hidden">
            <Show when={!childLevelIDs().length && !childItemIDs().length}>
              <div class="flex items-center h-7 pl-2">
                <span
                  class={clsx(
                    "text-xs",
                    isSelected(props.levelID)
                      ? "bg-gradient-to-tr bg-clip-text text-transparent"
                      : "text-gray-400 dark:text-gray-500"
                  )}
                >
                  {props.emptyMessage || "Empty"}
                </span>
              </div>
            </Show>
            <For each={childLevelIDs()}>{(id) => props.renderLevel(id)}</For>
            <For each={childItemIDs()}>{(id, index) => props.renderItem(id, index())}</For>
          </div>
        </div>
      </Show>
      <Show when={isRoot()}>
        <div>
          <For each={childLevelIDs()}>{(id, index) => props.renderLevel(id)}</For>
        </div>
        <div>
          <For each={childItemIDs()}>{(id, index) => props.renderItem(id, index())}</For>
        </div>
      </Show>
    </Show>
  );
};

export { TreeLevel };
export type { TreeLevelProps };
