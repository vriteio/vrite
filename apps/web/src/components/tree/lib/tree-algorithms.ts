interface TreeLevelData {
  items: string[];
  levels: string[];
}

type TreeStructure = Record<string, TreeLevelData>;
type TreeLayoutItem = { id: string; top: number; height: number };

const getTreeDescendants = (input: { tree: TreeStructure; levelID: string }): string[] => {
  const level = input.tree[input.levelID];
  if (!level) return [];

  const descendants: string[] = [];
  for (const childLevelID of level.levels) {
    descendants.push(childLevelID);
    descendants.push(...getTreeDescendants({ tree: input.tree, levelID: childLevelID }));
  }
  descendants.push(...level.items);
  return descendants;
};

const flattenTreeOrder = (input: {
  tree: TreeStructure;
  expanded: string[];
  rootID: string;
}): string[] => {
  const order: string[] = [];
  const expanded = new Set(input.expanded);
  const traverse = (levelID: string) => {
    const level = input.tree[levelID];
    if (!level || (!level.items.length && !level.levels.length)) return;

    for (const childLevelID of level.levels) {
      order.push(childLevelID);
      if (expanded.has(childLevelID)) traverse(childLevelID);
    }
    order.push(...level.items);
  };

  traverse(input.rootID);
  return order;
};

const flattenTreeLayout = (input: {
  tree: TreeStructure;
  expanded: string[];
  rootID: string;
  itemHeight: number;
  gap: number;
}): TreeLayoutItem[] => {
  const layout: TreeLayoutItem[] = [];
  const expanded = new Set(input.expanded);
  let top = 0;
  const traverse = (levelID: string) => {
    const level = input.tree[levelID];
    if (!level || (!level.items.length && !level.levels.length)) return;

    for (const childLevelID of level.levels) {
      const child = input.tree[childLevelID];
      const childExpanded = expanded.has(childLevelID);
      const isEmptyExpanded =
        Boolean(child) && childExpanded && !child.items.length && !child.levels.length;
      const height = isEmptyExpanded ? input.itemHeight * 2 + input.gap : input.itemHeight;

      layout.push({ id: childLevelID, top, height });
      top += height + input.gap;
      if (child && childExpanded && !isEmptyExpanded) traverse(childLevelID);
    }
    for (const itemID of level.items) {
      layout.push({ id: itemID, top, height: input.itemHeight });
      top += input.itemHeight + input.gap;
    }
  };

  traverse(input.rootID);
  return layout;
};

const normalizeTreeSelection = (input: {
  tree: TreeStructure;
  rawSelection: string[];
  exact: boolean;
  levelIDs?: Record<string, unknown>;
  visibleOrder: string[];
}): string[] => {
  if (input.rawSelection.length <= 1 || input.exact) return input.rawSelection;

  const selected = new Set(input.rawSelection);
  const normalized = new Set(input.rawSelection);
  for (const id of input.rawSelection) {
    if (!input.levelIDs?.[id]) continue;
    const descendants = getTreeDescendants({ tree: input.tree, levelID: id });
    if (descendants.some((descendant) => selected.has(descendant))) {
      descendants.forEach((descendant) => normalized.add(descendant));
    }
  }

  return normalized.size === selected.size
    ? input.rawSelection
    : input.visibleOrder.filter((id) => normalized.has(id));
};

export { flattenTreeLayout, flattenTreeOrder, getTreeDescendants, normalizeTreeSelection };
export type { TreeLayoutItem };
