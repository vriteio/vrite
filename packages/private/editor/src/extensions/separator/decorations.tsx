import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { STRUCTURE_NODE_TYPES } from "#editor/ui/constants";
import clsx from "clsx";

interface SeparatorOptions {
  propertiesBoundary?: "start" | "end";
  fragmentBoundary?: "end";
  label?: string;
  split?: boolean;
}

const createSeparator = ({
  propertiesBoundary,
  fragmentBoundary,
  label,
  split = false
}: SeparatorOptions = {}): HTMLElement => {
  const container = document.createElement("div");
  const separator = document.createElement("div");

  container.className = clsx(
    "gap-2 items-center w-full h-4",
    propertiesBoundary === "start" ? "hidden md:flex" : "flex"
  );
  separator.className = "flex-1 bg-gray-200 h-px rounded-full";
  container.setAttribute("data-structure-separator", "");

  if (fragmentBoundary === "end") container.setAttribute("data-fragment-end-boundary", "");
  if (split) container.setAttribute("data-fragment-drop-split", "");

  if (label) {
    const labelElement = document.createElement("span");

    labelElement.className = "text-xs text-gray-300";
    labelElement.textContent = label;
    container.appendChild(labelElement);
  }

  container.appendChild(separator);

  return container;
};
const createBaseDecorations = (doc: ProseMirrorNode): DecorationSet => {
  const decorations: Decoration[] = [];

  doc.forEach((node, pos) => {
    const boundaryPos = pos + node.nodeSize;
    const nextNode = doc.nodeAt(boundaryPos);
    const endsStructureSection =
      STRUCTURE_NODE_TYPES.has(node.type.name) &&
      (!nextNode || !STRUCTURE_NODE_TYPES.has(nextNode.type.name));

    if (endsStructureSection) {
      decorations.push(
        Decoration.widget(
          boundaryPos,
          () =>
            createSeparator({
              fragmentBoundary: node.type.name === "fragment" ? "end" : undefined,
              propertiesBoundary: node.type.name === "property" ? "end" : undefined
            }),
          { key: `${node.type.name}-separator-${boundaryPos}` }
        )
      );
    }

    if (node.type.name !== "property" && nextNode?.type.name === "property") {
      decorations.push(
        Decoration.widget(
          boundaryPos,
          () => createSeparator({ label: "Properties", propertiesBoundary: "start" }),
          {
            key: `property-separator-${boundaryPos}`
          }
        )
      );
    }
  });

  return DecorationSet.create(doc, decorations);
};
const createSplitDecoration = (doc: ProseMirrorNode, pos: number): Decoration | null => {
  const $pos = doc.resolve(pos);
  const splitsFragments =
    $pos.depth === 0 &&
    $pos.nodeBefore?.type.name === "fragment" &&
    $pos.nodeAfter?.type.name === "fragment";

  return splitsFragments
    ? Decoration.widget(pos, () => createSeparator({ fragmentBoundary: "end", split: true }), {
        key: `fragment-drop-split-${pos}`
      })
    : null;
};
const addSplitDecoration = (
  doc: ProseMirrorNode,
  baseDecorations: DecorationSet,
  splitPos: number | null
): DecorationSet => {
  if (splitPos === null) return baseDecorations;

  const decoration = createSplitDecoration(doc, splitPos);

  return decoration ? baseDecorations.add(doc, [decoration]) : baseDecorations;
};

export { addSplitDecoration, createBaseDecorations };
