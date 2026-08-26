import { Decoration, type Editor, Extension } from "@tiptap/core";
import { type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { type EditorDiff, type EditorDiffChange } from "../../client-types";
import { createWidgetRenderer } from "../../lib";
import { VersionDiffBadges } from "./badges";

interface VersionDiffOptions extends EditorDiff {
  owner: unknown;
}

interface ChangeBadgeGroup {
  block: boolean;
  nestedBlock: boolean;
  side: number;
  types: Set<EditorDiffChange["type"]>;
}

const getChangeClass = (change: EditorDiffChange) => {
  const removedInlineClass =
    change.type === "removed" && change.inline ? " version-diff-removed-inline" : "";

  return `version-diff-${change.type} version-diff-${
    change.inline ? "inline" : "block"
  }${removedInlineClass}`;
};
const getChangeAnchor = (document: ProseMirrorNode, change: EditorDiffChange) => {
  if (!change.inline) {
    const node = document.nodeAt(change.from);

    return {
      block: true,
      nestedBlock: Boolean(node && !node.isLeaf),
      position: node && !node.isLeaf ? change.from + 1 : change.from,
      side: node?.type.name === "property" ? 1 : -1
    };
  }

  const position = document.resolve(change.from);

  for (let depth = position.depth; depth > 0; depth -= 1) {
    if (position.node(depth).isBlock) {
      return { block: true, nestedBlock: true, position: position.start(depth), side: -1 };
    }
  }

  return { block: false, nestedBlock: false, position: change.from, side: -1 };
};
const getBadgeAnchorClass = (group: ChangeBadgeGroup) => {
  return [
    "version-diff-badges-anchor",
    group.block && "version-diff-badges-anchor-block",
    group.nestedBlock && "version-diff-badges-anchor-nested"
  ]
    .filter(Boolean)
    .join(" ");
};
const createVersionDiffDecorations = (
  editor: Editor,
  document: ProseMirrorNode,
  changes: EditorDiffChange[],
  owner: unknown
): Decoration[] => {
  const badgeGroups = new Map<number, ChangeBadgeGroup>();
  const decorations: Decoration[] = changes.map((change) => {
    const anchor = getChangeAnchor(document, change);
    const group = badgeGroups.get(anchor.position) ?? {
      block: anchor.block,
      nestedBlock: anchor.nestedBlock,
      side: anchor.side,
      types: new Set<EditorDiffChange["type"]>()
    };
    const attributes = { class: getChangeClass(change) };

    group.types.add(change.inline ? "modified" : change.type);
    badgeGroups.set(anchor.position, group);

    return change.inline
      ? Decoration.Inline(change.from, change.to, attributes)
      : Decoration.Node(change.from, change.to, attributes);
  });

  for (const [position, group] of badgeGroups) {
    const types = [...group.types];

    decorations.push(
      createWidgetRenderer(VersionDiffBadges, {
        class: getBadgeAnchorClass(group),
        editor,
        key: `version-diff-badges:${position}:${types.join(",")}`,
        owner,
        pos: position,
        props: { types },
        side: group.side
      })
    );
  }

  return decorations;
};

const VersionDiff = Extension.create<VersionDiffOptions>({
  name: "versionDiff",
  addOptions() {
    return { changes: [], owner: null };
  },
  addDecorations() {
    const changes = this.options.changes;
    const owner = this.options.owner;

    return {
      create: ({ editor, state }) => {
        return createVersionDiffDecorations(editor, state.doc, changes, owner);
      },
      update: "manual"
    };
  }
});

export { VersionDiff };
export { createVersionComparison } from "./merge";
