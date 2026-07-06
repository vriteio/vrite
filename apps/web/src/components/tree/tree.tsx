import { Accessor, JSX, ParentComponent } from "solid-js";
import { TREE_ROOT_ID, TreeProvider, type TreeMap } from "./tree-context";
import { TreeSelection } from "./tree-selection";
import { TreeLevel } from "./tree-level";

interface TreeProps {
  tree: Accessor<TreeMap>;
  levelIDs?: Accessor<Record<string, unknown>>;
  renderLevel: (levelID: string) => JSX.Element;
  renderItem: (itemID: string) => JSX.Element;
  emptyMessage?: string;
}

const Tree: ParentComponent<TreeProps> = (props) => {
  return (
    <TreeProvider tree={props.tree} levelIDs={props.levelIDs}>
      <TreeSelection />
      <TreeLevel
        levelID={TREE_ROOT_ID}
        tree={props.tree}
        renderLevel={props.renderLevel}
        renderItem={props.renderItem}
        emptyMessage={props.emptyMessage}
      />
      {props.children}
    </TreeProvider>
  );
};

export { Tree };
export type { TreeProps };
