import { type Accessor, type JSX, type ParentComponent } from "solid-js";
import { TREE_ROOT_ID, TreeProvider, type TreeMap, type TreeSize } from "./tree-context";
import { TreeSelection } from "./tree-selection";
import { TreeLevel } from "./tree-level";
import { TreeRoot } from "./tree-root";

interface TreeProps {
  tree: Accessor<TreeMap>;
  levelIDs?: Accessor<Record<string, unknown>>;
  renderLevel?(levelID: string): JSX.Element;
  renderItem?(itemID: string): JSX.Element;
  emptyMessage?: string;
  itemHeight?: TreeSize;
  gap?: TreeSize;
}

const Tree: ParentComponent<TreeProps> = (props) => (
  <TreeProvider
    tree={props.tree}
    levelIDs={props.levelIDs}
    itemHeight={props.itemHeight}
    gap={props.gap}
  >
    <TreeRoot>
      <TreeSelection />
      <TreeLevel
        levelID={TREE_ROOT_ID}
        tree={props.tree}
        renderLevel={props.renderLevel}
        renderItem={props.renderItem}
        emptyMessage={props.emptyMessage}
      />
      {props.children}
    </TreeRoot>
  </TreeProvider>
);

export { Tree };
export type { TreeProps };
