import { Accessor, JSX, onCleanup, onMount, ParentComponent } from "solid-js";
import { TREE_ROOT_ID, TreeProvider, type TreeMap, useTree } from "./tree-context";
import { TreeSelection } from "./tree-selection";
import { TreeLevel } from "./tree-level";
import { TreeRoot } from "./tree-root";

interface TreeProps {
  tree: Accessor<TreeMap>;
  levelIDs?: Accessor<Record<string, unknown>>;
  renderLevel?(levelID: string): JSX.Element;
  renderItem?(itemID: string): JSX.Element;
  emptyMessage?: string;
  itemHeight?: number;
}

const Tree: ParentComponent<TreeProps> = (props) => {
  return (
    <TreeProvider tree={props.tree} levelIDs={props.levelIDs} itemHeight={props.itemHeight}>
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
};

export { Tree };
export type { TreeProps };
