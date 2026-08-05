import clsx from "clsx";
import { type Accessor, type Component, For, type JSX, Show } from "solid-js";
import { TREE_ROOT_ID, type TreeMap, useTree } from "./tree-context";

interface TreeLevelProps {
  levelID: string;
  tree: Accessor<TreeMap>;
  renderLevel?(levelID: string): JSX.Element;
  renderItem?(itemID: string, index: number): JSX.Element;
  renderCollectionBoundary?(): JSX.Element;
  renderEntryBoundary?(): JSX.Element;
  emptyMessage?: string;
  highlighted?: boolean;
  highlightBackground?: boolean;
}

const TreeLevel: Component<TreeLevelProps> = (props) => {
  const [{ isSelected, isExpanded, gap }] = useTree();
  const isRoot = () => props.levelID === TREE_ROOT_ID;
  const levelData = () => props.tree()[props.levelID];
  const childLevelIDs = () => levelData()?.levels || [];
  const childItemIDs = () => levelData()?.items || [];
  const renderLevel = (levelID: string) => props.renderLevel?.(levelID) || <></>;
  const renderItem = (itemID: string, index: Accessor<number>) => {
    return props.renderItem?.(itemID, index()) || <></>;
  };
  const PlaceholderHighlight = () => (
    <Show when={props.highlighted && (props.highlightBackground ?? true)}>
      <div class="absolute inset-0 -z-10 rounded-r-lg opacity-10 from-secondary via-primary to-transparent bg-gradient-to-r" />
    </Show>
  );

  return (
    <Show when={isRoot() || isExpanded(props.levelID)}>
      <Show when={!isRoot()}>
        <div class="flex" style={{ "margin-top": `${gap}px` }}>
          <div class="min-w-3.5 pl-0.5 flex justify-end items-center">
            <div
              class={clsx(
                "h-full w-px rounded-full bg-gray-300 dark:border-gray-600",
                (isSelected(props.levelID) || props.highlighted) && "bg-gradient-to-b"
              )}
            />
          </div>
          <div class="flex flex-col flex-1">
            <Show when={!childLevelIDs().length && !childItemIDs().length}>
              <div class="h-7 flex items-center pl-2 rounded-r-lg relative">
                <PlaceholderHighlight />
                <span
                  class={clsx(
                    "text-xs",
                    isSelected(props.levelID) || props.highlighted
                      ? "bg-gradient-to-tr bg-clip-text text-transparent select-none"
                      : "text-gray-400 dark:text-gray-500"
                  )}
                >
                  {props.emptyMessage || "Empty"}
                </span>
              </div>
            </Show>
            <div class="flex flex-col" style={{ gap: `${gap}px` }}>
              <For each={childLevelIDs()}>{renderLevel}</For>
            </div>
            {props.renderCollectionBoundary?.()}
            <div
              class="flex flex-col"
              style={{
                "gap": `${gap}px`,
                "margin-top":
                  childLevelIDs().length && childItemIDs().length ? `${gap}px` : undefined
              }}
            >
              <For each={childItemIDs()}>{renderItem}</For>
            </div>
            {props.renderEntryBoundary?.()}
          </div>
        </div>
      </Show>
      <Show when={isRoot()}>
        <div class="flex flex-col" style={{ gap: `${gap}px` }}>
          <For each={childLevelIDs()}>{renderLevel}</For>
          <For each={childItemIDs()}>{renderItem}</For>
        </div>
      </Show>
    </Show>
  );
};

export { TreeLevel };
export type { TreeLevelProps };
