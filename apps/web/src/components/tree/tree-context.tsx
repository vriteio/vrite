import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  on,
  ParentComponent,
  Setter,
  useContext
} from "solid-js";

interface TreeData {
  items: string[];
  levels: string[];
}

type TreeMap = Record<string, TreeData>;

interface TreeContextValue {
  selection: Accessor<string[]>;
  expanded: Accessor<string[]>;
  itemHeight: number;
  isSelected(id: string): boolean;
  isRenaming(id: string): boolean;
  isExpanded(id: string): boolean;
  flattenedOrder(): string[];
}

interface TreeContextActions {
  setSelection: Setter<string[]>;
  setExpanded: Setter<string[]>;
  setRenaming: Setter<string | null>;
  toggleExpanded(id: string): void;
}

type TreeContextType = [TreeContextValue, TreeContextActions];

const TreeContext = createContext<TreeContextType>();

interface TreeProviderProps {
  tree: Accessor<TreeMap>;
  levelIDs?: Accessor<Record<string, unknown>>;
  itemHeight?: number;
  initialExpanded?: Accessor<string[] | undefined>;
  expandedSourceKey?: Accessor<string | null>;
  persistExpandedReady?: Accessor<boolean>;
  onExpandedChange?(expanded: string[]): void;
}

const TreeProvider: ParentComponent<TreeProviderProps> = (props) => {
  const [rawSelection, setRawSelection] = createSignal<string[]>([]);
  const [expanded, setExpanded] = createSignal<string[]>(props.initialExpanded?.() ?? []);
  const [renaming, setRenaming] = createSignal<string | null>(null);
  const isRenaming = (id: string) => renaming() === id;
  const isExpanded = (id: string) => expanded().includes(id);
  const toggleExpanded = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((expandedId) => expandedId !== id) : [...prev, id]
    );
  };

  const flattenedOrder = (): string[] => {
    const order: string[] = [];
    const tree = props.tree();

    const traverse = (levelID: string) => {
      const level = tree[levelID];

      if (!level || (!level.items.length && !level.levels.length)) {
        order.push(levelID);
        return;
      }

      for (const childLevelID of level.levels) {
        order.push(childLevelID);

        if (isExpanded(childLevelID)) {
          traverse(childLevelID);
        }
      }

      for (const itemID of level.items) {
        order.push(itemID);
      }
    };

    traverse("*");

    return order;
  };

  const getDescendants = (levelID: string): string[] => {
    const tree = props.tree();
    const level = tree[levelID];

    if (!level) return [];

    const descendants: string[] = [];

    for (const childLevelID of level.levels) {
      descendants.push(childLevelID);
      descendants.push(...getDescendants(childLevelID));
    }

    for (const itemID of level.items) {
      descendants.push(itemID);
    }

    return descendants;
  };

  const selection = createMemo<string[]>(() => {
    const raw = rawSelection();

    if (raw.length <= 1) return raw;

    const levelMap = props.levelIDs?.() || {};
    const selectedSet = new Set(raw);
    const expandedSet = new Set(raw);

    for (const id of raw) {
      if (!levelMap[id]) continue;

      const descendants = getDescendants(id);
      const hasSelectedDescendant = descendants.some((d) => selectedSet.has(d));

      if (hasSelectedDescendant) {
        for (const d of descendants) {
          expandedSet.add(d);
        }
      }
    }

    if (expandedSet.size === selectedSet.size) return raw;

    const order = flattenedOrder();

    return order.filter((id) => expandedSet.has(id));
  });

  const isSelected = (id: string) => {
    return selection().includes(id);
  };
  const setSelection: Setter<string[]> = (value) => {
    return setRawSelection<string[]>(typeof value === "function" ? value(selection()) : value);
  };

  createEffect(
    on(
      () => [props.expandedSourceKey?.(), props.initialExpanded?.()] as const,
      ([_, initialExpanded]) => {
        setExpanded(Array.from(new Set(initialExpanded ?? [])));
      }
    )
  );

  createEffect(
    on(
      [expanded, () => props.levelIDs?.(), () => props.persistExpandedReady?.() ?? true] as const,
      ([expandedIDs, levelIDs, isReady]) => {
        if (!isReady) {
          return;
        }

        const nextExpanded = expandedIDs.filter((id) => !levelIDs || Boolean(levelIDs[id]));

        if (nextExpanded.length !== expandedIDs.length) {
          setExpanded(nextExpanded);
          return;
        }

        props.onExpandedChange?.(nextExpanded);
      },
      { defer: true }
    )
  );

  return (
    <TreeContext.Provider
      value={[
        {
          selection,
          expanded,
          itemHeight: props.itemHeight ?? 28,
          isSelected,
          isRenaming,
          isExpanded,
          flattenedOrder
        },
        {
          setSelection,
          setExpanded,
          setRenaming,
          toggleExpanded
        }
      ]}
    >
      {props.children}
    </TreeContext.Provider>
  );
};

const useTree = () => {
  return useContext(TreeContext)!;
};

export { TreeProvider, useTree };
export type { TreeData, TreeMap, TreeContextType };
