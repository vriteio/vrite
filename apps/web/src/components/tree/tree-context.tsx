import {
  type Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  on,
  type ParentComponent,
  type Setter,
  useContext
} from "solid-js";
import {
  flattenTreeLayout,
  flattenTreeOrder,
  normalizeTreeSelection,
  type TreeLayoutItem
} from "./lib";

interface TreeData {
  items: string[];
  levels: string[];
}

type TreeMap = Record<string, TreeData>;
type TreeFocusSource = "hover" | "keyboard";
type TreeSelectionMode = "normal" | "exact";
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
    return flattenTreeOrder({ tree: props.tree(), expanded: expanded(), rootID: TREE_ROOT_ID });
  };
  const flattenedLayout = (): TreeLayoutItem[] => {
    return flattenTreeLayout({
      tree: props.tree(),
      expanded: expanded(),
      rootID: TREE_ROOT_ID,
      itemHeight: props.itemHeight ?? 28,
      gap: props.gap ?? 2
    });
  };

  const selection = createMemo<string[]>(() => {
    return normalizeTreeSelection({
      tree: props.tree(),
      rawSelection: rawSelection(),
      exact: selectionMode() === "exact",
      levelIDs: props.levelIDs?.(),
      visibleOrder: flattenedOrder()
    });
  });

  const isSelected = (id: string) => selection().includes(id);
  const isFocused = (id: string) => focusedID() === id;
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

  createEffect(() => {
    const visibleIDs = new Set(flattenedOrder());

    setRawSelection((current) => {
      const visibleSelection = current.filter((id) => visibleIDs.has(id));

      return visibleSelection.length === current.length ? current : visibleSelection;
    });
    setFocusedID((current) => {
      if (current && !visibleIDs.has(current)) {
        setFocusedSource(null);

        return null;
      }

      return current;
    });
  });

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

const useTree = () => useContext(TreeContext)!;

export { TREE_ROOT_ID, TreeProvider, useTree };
export type { TreeData, TreeMap, TreeContextType };
