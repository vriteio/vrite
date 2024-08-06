import {
  Component,
  For,
  createSignal,
  Show,
  ParentComponent,
  createContext,
  Accessor,
  useContext,
  JSX,
  splitProps,
  Setter,
  createEffect
} from "solid-js";
import { Dynamic } from "solid-js/web";

interface TreeItem<D extends object = any> {
  label: string;
  id?: string;
  collapsible?: boolean;
  children?: Array<TreeItem<D>>;
  data?: D;
}
interface TreeContextData {
  expanded: Accessor<string[]>;
  setExpanded: Setter<string[]>;
  collapsible(): boolean;
  getId(item: TreeItem): string;
}
interface TreeItemUIProps<D extends object = any>
  extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  as?:
    | keyof JSX.IntrinsicElements
    | ParentComponent<{
        onClick(event: MouseEvent & { currentTarget: HTMLElement; target: Element }): void;
      }>;
  item: TreeItem<D>;
}
interface TreeLevelProps<D extends object = any> {
  items: Array<TreeItem<D>>;
  level: number;
  children: ParentComponent<{
    item: TreeItem<D>;
    id: string;
    isExpanded: boolean;
    level: number;
  }>;
}
interface TreeRootProps<D extends object = any> extends Omit<TreeLevelProps<D>, "level"> {
  collapsible?: boolean;
  expanded?: string[];
  setExpanded?(expanded: string[]): void;
  getId?(item: TreeItem<D>): string;
}

const TreeContext = createContext<TreeContextData>();
const useTree = (): TreeContextData => {
  return useContext(TreeContext)!;
};
const TreeItemUI = <D extends object = any>(
  props: TreeItemUIProps<D> & { children?: JSX.Element }
): JSX.Element => {
  const { collapsible, getId, setExpanded } = useTree();
  const [, passProps] = splitProps(props, ["as", "onClick"]);

  return (
    <Dynamic
      {...passProps}
      component={props.as || "button"}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
        if (collapsible()) {
          setExpanded((expanded) => {
            const id = getId(props.item);

            if (expanded.includes(id)) {
              return expanded.filter((expandedId) => expandedId !== id);
            } else {
              const childIds: string[] = [];
              const getChildIds = (item: TreeItem): void => {
                childIds.push(getId(item));
                item.children?.forEach(getChildIds);
              };

              props.item.children?.forEach(getChildIds);

              const expandedChildIds = childIds.filter((childId) => expanded.includes(childId));

              if (expandedChildIds.length > 0) {
                return expanded.filter((expandedId) => !expandedChildIds.includes(expandedId));
              } else {
                return [...expanded, id];
              }
            }
          });
        }

        if (typeof props.onClick === "function") {
          props.onClick(event);
        }
      }}
    >
      {props.children}
    </Dynamic>
  );
};
const TreeLevel: Component<TreeLevelProps> = (props) => {
  const { collapsible, expanded, getId } = useTree();
  const isExpanded = (item: TreeItem): boolean => {
    if (collapsible() && item.collapsible !== false) {
      const id = getId(item);

      if (expanded().includes(id)) return true;

      const getChildIds = (item: TreeItem): string[] => {
        return (
          item.children?.flatMap((child) => {
            return [getId(child), ...getChildIds(child)];
          }) || []
        );
      };

      if (getChildIds(item).some((id) => expanded().includes(id))) {
        return true;
      }

      return false;
    }

    return true;
  };

  return (
    <For each={props.items}>
      {(item) => {
        return (
          <Dynamic
            component={props.children}
            item={item}
            id={getId(item)}
            isExpanded={isExpanded(item)}
            level={props.level}
          >
            <Show when={item.children?.length}>
              <TreeLevel items={item.children || []} level={props.level + 1}>
                {props.children}
              </TreeLevel>
            </Show>
          </Dynamic>
        );
      }}
    </For>
  );
};
const TreeRoot = <D extends object = any>(props: TreeRootProps<D>): JSX.Element => {
  const [expanded, setExpanded] = createSignal(props.expanded || []);
  const collapsible = (): boolean => {
    return typeof props.collapsible === "boolean" ? props.collapsible : true;
  };
  const getId = (item?: TreeItem): string => {
    return item ? item.id || props.getId?.(item) || "" : "";
  };

  createEffect(() => {
    setExpanded(props.expanded || []);
  });
  createEffect(() => {
    props.setExpanded?.(expanded());
  });

  return (
    <TreeContext.Provider
      value={{
        expanded,
        setExpanded,
        collapsible,
        getId
      }}
    >
      <TreeLevel items={props.items} level={1}>
        {props.children}
      </TreeLevel>
    </TreeContext.Provider>
  );
};
const Tree = {
  Root: TreeRoot,
  Item: TreeItemUI
};

export { Tree };
export type { TreeItem };
