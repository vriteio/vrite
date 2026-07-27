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
type TreeFocusSource = "hover" | "keyboard";
type TreeSelectionMode = "normal" | "exact";
type TreeLayoutItem = {
  id: string;
  top: number;
  height: number;
};

interface TreeContextValue {
  selection: Accessor<string[]>;
  expanded: Accessor<string[]>;
  focusedID: Accessor<string | null>;
  focusedSource: Accessor<TreeFocusSource | null>;
  itemHeight: number;
  gap: number;
  isSelected(id: string): boolean;
  isFocused(id: string): boolean;
  isRenaming(id: string): boolean;
  isExpanded(id: string): boolean;
  getItemHeight(id: string): number;
  flattenedOrder(): string[];
  flattenedLayout(): TreeLayoutItem[];
}

interface TreeContextActions {
  setSelection: Setter<string[]>;
  setExactSelection(selection: string[]): void;
  setExpanded: Setter<string[]>;
  setFocusedID: Setter<string | null>;
  setFocusedItem(id: string | null, source: TreeFocusSource | null): void;
  setRenaming: Setter<string | null>;
  toggleExpanded(id: string): void;
}

type TreeContextType = [TreeContextValue, TreeContextActions];

const TREE_ROOT_ID = "~";
const TreeContext = createContext<TreeContextType>();

interface TreeProviderProps {
  tree: Accessor<TreeMap>;
  levelIDs?: Accessor<Record<string, unknown>>;
  itemHeight?: number;
  gap?: number;
  initialExpanded?: Accessor<string[] | undefined>;
  expandedSourceKey?: Accessor<string | null>;
  persistExpandedReady?: Accessor<boolean>;
  onExpandedChange?(expanded: string[]): void;
}

const TreeProvider: ParentComponent<TreeProviderProps> = (props) => {
  const [rawSelection, setRawSelection] = createSignal<string[]>([]);
  const [selectionMode, setSelectionMode] = createSignal<TreeSelectionMode>("normal");
  const [expanded, setExpanded] = createSignal<string[]>(props.initialExpanded?.() ?? []);
  const [focusedID, setFocusedID] = createSignal<string | null>(null);
  const [focusedSource, setFocusedSource] = createSignal<TreeFocusSource | null>(null);
  const [renaming, setRenaming] = createSignal<string | null>(null);
  const isRenaming = (id: string) => renaming() === id;
  const isExpanded = (id: string) => expanded().includes(id);
  const getItemHeight = (id: string) => {
    const itemHeight = props.itemHeight ?? 28;
    const level = props.tree()[id];

    if (!level || !isExpanded(id)) return itemHeight;

    if (!level.items.length && !level.levels.length) return itemHeight * 2;

    return itemHeight;
  };
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

    traverse(TREE_ROOT_ID);

    return order;
  };
  const flattenedLayout = (): TreeLayoutItem[] => {
    const layout: TreeLayoutItem[] = [];
    const tree = props.tree();
    const itemHeight = props.itemHeight ?? 28;
    const gap = props.gap ?? 2;
    let top = 0;

    const traverse = (levelID: string) => {
      const level = tree[levelID];

      if (!level || (!level.items.length && !level.levels.length)) {
        return;
      }

      for (const childLevelID of level.levels) {
        const childLevel = tree[childLevelID];
        const childExpanded = isExpanded(childLevelID);
        const isEmptyExpanded =
          Boolean(childLevel) &&
          childExpanded &&
          !childLevel!.items.length &&
          !childLevel!.levels.length;

        const height = isEmptyExpanded ? itemHeight * 2 + gap : itemHeight;

        layout.push({
          id: childLevelID,
          top,
          height
        });
        top += height + gap;

        if (childLevel && childExpanded && !isEmptyExpanded) {
          traverse(childLevelID);
        }
      }

      for (const itemID of level.items) {
        layout.push({ id: itemID, top, height: itemHeight });
        top += itemHeight + gap;
      }
    };

    traverse(TREE_ROOT_ID);

    return layout;
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

    if (raw.length <= 1 || selectionMode() === "exact") return raw;

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
  const isFocused = (id: string) => {
    return focusedID() === id;
  };
  const setSelection: Setter<string[]> = (value) => {
    setSelectionMode("normal");

    return setRawSelection<string[]>(typeof value === "function" ? value(selection()) : value);
  };
  const setExactSelection = (selection: string[]) => {
    setSelectionMode("exact");
    setRawSelection(selection);
  };
  const setFocusedIDAction: Setter<string | null> = (value) => {
    return setFocusedID((prev) => {
      const next = typeof value === "function" ? value(prev) : value;

      setFocusedSource(null);

      return next;
    });
  };
  const setFocusedItem = (id: string | null, source: TreeFocusSource | null) => {
    setFocusedID(id);
    setFocusedSource(id ? source : null);
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
          focusedID,
          focusedSource,
          itemHeight: props.itemHeight ?? 28,
          gap: props.gap ?? 2,
          isSelected,
          isFocused,
          isRenaming,
          isExpanded,
          getItemHeight,
          flattenedOrder,
          flattenedLayout
        },
        {
          setSelection,
          setExactSelection,
          setExpanded,
          setFocusedID: setFocusedIDAction,
          setFocusedItem,
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

export { TREE_ROOT_ID, TreeProvider, useTree };
export type { TreeData, TreeMap, TreeContextType };
