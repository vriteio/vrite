import type { JSONContent } from "@tiptap/core";
import type { EditorDiffChange, MergedVersionDiff, VersionComparison } from "../../client-types";
import {
  getBlockFallbackIdentity,
  getComparableIdentity,
  getUserFacingAttributeIdentity
} from "./identity";
import {
  cloneNode,
  createContentMerge,
  mergeInlineContent,
  type VersionDiffContent,
  type VersionDiffContentMerge
} from "./inline";

interface BlockDescriptor {
  id?: string;
  index: number;
  node: JSONContent;
}

interface BlockPair {
  current: BlockDescriptor;
  previous: BlockDescriptor;
}

interface FinalizedNode {
  content: JSONContent;
  size: number;
}

const LEAF_NODE_TYPES = new Set(["hardBreak", "horizontalRule", "property"]);
const TEXT_BLOCK_TYPES = new Set(["heading", "paragraph", "title"]);
const MIN_INLINE_DIFF_SIMILARITY = 0.5;

const appendContentMerge = (target: VersionDiffContentMerge, source: VersionDiffContentMerge) => {
  target.current.push(...source.current);
  target.inline.push(...source.inline);
  target.previous.push(...source.previous);
};
const appendChangedNode = (
  content: VersionDiffContentMerge,
  node: JSONContent,
  type: "added" | "removed"
) => {
  content.inline.push(cloneNode(node, type, type === "removed"));
  content[type === "added" ? "current" : "previous"].push(cloneNode(node, type));
};
const createNodeMerge = (
  previous: JSONContent,
  current: JSONContent,
  diff?: EditorDiffChange["type"]
): VersionDiffContentMerge => ({
  current: [cloneNode(current, diff)],
  inline: [cloneNode(current, diff)],
  previous: [cloneNode(previous, diff)]
});
const wrapContentMerge = (
  previous: JSONContent,
  current: JSONContent,
  content: VersionDiffContentMerge
): VersionDiffContentMerge => ({
  current: [{ ...cloneNode(current), content: content.current }],
  inline: [{ ...cloneNode(current), content: content.inline }],
  previous: [{ ...cloneNode(previous), content: content.previous }]
});
const getBlocks = (nodes: JSONContent[]) => {
  return nodes.map<BlockDescriptor>((node, index) => ({
    id: typeof node.attrs?.id === "string" ? node.attrs.id : undefined,
    index,
    node
  }));
};
const getUniqueBlocksByIdentity = (blocks: BlockDescriptor[]) => {
  const uniqueBlocks = new Map<string, BlockDescriptor | null>();

  for (const block of blocks) {
    const identity = getBlockFallbackIdentity(block.node);

    uniqueBlocks.set(identity, uniqueBlocks.has(identity) ? null : block);
  }

  return uniqueBlocks;
};
const pairBlocks = (previousNodes: JSONContent[], currentNodes: JSONContent[]) => {
  const previousBlocks = getBlocks(previousNodes);
  const currentBlocks = getBlocks(currentNodes);
  const pairs: BlockPair[] = [];
  const pairedPrevious = new Set<BlockDescriptor>();
  const pairedCurrent = new Set<BlockDescriptor>();
  const currentByID = new Map(
    currentBlocks.filter((block) => block.id).map((block) => [block.id, block])
  );

  for (const previous of previousBlocks) {
    const current = previous.id ? currentByID.get(previous.id) : undefined;

    if (!current || current.node.type !== previous.node.type || pairedCurrent.has(current))
      continue;

    pairedPrevious.add(previous);
    pairedCurrent.add(current);
    pairs.push({ current, previous });
  }

  const unmatchedPrevious = previousBlocks.filter((block) => !pairedPrevious.has(block));
  const unmatchedCurrent = currentBlocks.filter((block) => !pairedCurrent.has(block));
  const previousByIdentity = getUniqueBlocksByIdentity(unmatchedPrevious);
  const currentByIdentity = getUniqueBlocksByIdentity(unmatchedCurrent);

  for (const [identity, previous] of previousByIdentity) {
    const current = currentByIdentity.get(identity);

    if (!previous || !current) continue;

    pairs.push({ current, previous });
  }

  return pairs;
};
const getStableBlockPairs = (previousNodes: JSONContent[], currentNodes: JSONContent[]) => {
  const pairs = pairBlocks(previousNodes, currentNodes).sort(
    (left, right) => left.previous.index - right.previous.index
  );
  const predecessors = new Array<number>(pairs.length).fill(-1);
  const tails: number[] = [];

  for (let index = 0; index < pairs.length; index += 1) {
    const currentIndex = pairs[index].current.index;
    let low = 0;
    let high = tails.length;

    while (low < high) {
      const middle = Math.floor((low + high) / 2);

      if (pairs[tails[middle]].current.index < currentIndex) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    if (low > 0) predecessors[index] = tails[low - 1];

    tails[low] = index;
  }

  const stablePairs: BlockPair[] = [];
  let tail = tails.at(-1) ?? -1;

  while (tail >= 0) {
    stablePairs.push(pairs[tail]);
    tail = predecessors[tail];
  }

  return stablePairs.reverse();
};
const createReplacement = (
  previous: JSONContent,
  current: JSONContent
): VersionDiffContentMerge => {
  const content = createContentMerge();

  appendChangedNode(content, previous, "removed");
  appendChangedNode(content, current, "added");

  return content;
};
const mergeMatchedNode = (previous: JSONContent, current: JSONContent): VersionDiffContentMerge => {
  const unchanged = getComparableIdentity(previous) === getComparableIdentity(current);
  const attributesChanged =
    getUserFacingAttributeIdentity(previous) !== getUserFacingAttributeIdentity(current);
  const propertyIdentityChanged =
    current.type === "property" &&
    getBlockFallbackIdentity(previous) !== getBlockFallbackIdentity(current);

  if (unchanged) {
    return createNodeMerge(previous, current);
  }

  if (propertyIdentityChanged) return createReplacement(previous, current);

  if (attributesChanged) {
    return createNodeMerge(previous, current, "modified");
  }

  if (current.type && TEXT_BLOCK_TYPES.has(current.type)) {
    const inlineMerge = mergeInlineContent(previous.content, current.content);
    const useInlineDiff =
      current.type === "title" || inlineMerge.similarity >= MIN_INLINE_DIFF_SIMILARITY;

    if (!useInlineDiff) return createReplacement(previous, current);

    return wrapContentMerge(previous, current, inlineMerge);
  }

  if (previous.content && current.content) {
    const content = mergeNodeSequence(previous.content, current.content);

    return wrapContentMerge(previous, current, content);
  }

  return createReplacement(previous, current);
};
const mergeNodeSequence = (
  previousNodes: JSONContent[] = [],
  currentNodes: JSONContent[] = []
): VersionDiffContentMerge => {
  const pairs = getStableBlockPairs(previousNodes, currentNodes);
  const content = createContentMerge();
  let previousIndex = 0;
  let currentIndex = 0;

  for (const pair of pairs) {
    while (previousIndex < pair.previous.index) {
      appendChangedNode(content, previousNodes[previousIndex], "removed");
      previousIndex += 1;
    }

    while (currentIndex < pair.current.index) {
      appendChangedNode(content, currentNodes[currentIndex], "added");
      currentIndex += 1;
    }

    const matched = mergeMatchedNode(previousNodes[previousIndex], currentNodes[currentIndex]);

    appendContentMerge(content, matched);
    previousIndex += 1;
    currentIndex += 1;
  }

  while (previousIndex < previousNodes.length) {
    appendChangedNode(content, previousNodes[previousIndex], "removed");
    previousIndex += 1;
  }

  while (currentIndex < currentNodes.length) {
    appendChangedNode(content, currentNodes[currentIndex], "added");
    currentIndex += 1;
  }

  return content;
};
const finalizeNode = (
  node: VersionDiffContent,
  position: number,
  changes: EditorDiffChange[],
  root = false
): FinalizedNode => {
  const { content: _, diff: __, ...nodeContent } = node;
  const content: JSONContent[] = [];
  const leaf = !!node.type && LEAF_NODE_TYPES.has(node.type);
  let contentSize = 0;

  for (const child of node.content ?? []) {
    const childPosition = position + contentSize + (root ? 0 : 1);
    const finalizedChild = finalizeNode(child, childPosition, changes);

    content.push(finalizedChild.content);
    contentSize += finalizedChild.size;
  }

  const size = node.type === "text" ? (node.text?.length ?? 0) : leaf ? 1 : contentSize + 2;

  if (node.diff) {
    changes.push({
      from: position,
      inline: node.type === "text",
      to: position + size,
      type: node.diff
    });
  }

  return {
    content: {
      ...nodeContent,
      content: content.length ? content : undefined
    },
    size
  };
};
const finalizeDocument = (content: VersionDiffContent[]): MergedVersionDiff => {
  const changes: EditorDiffChange[] = [];
  const finalized = finalizeNode({ content, type: "doc" }, 0, changes, true);

  return { changes, content: finalized.content };
};
const createVersionComparison = (
  previousDocument: JSONContent,
  currentDocument: JSONContent
): VersionComparison => {
  const previousContent = previousDocument.content ?? [];
  const currentContent = currentDocument.content ?? [];
  const previousTitle = previousContent[0]?.type === "title" ? previousContent[0] : undefined;
  const currentTitle = currentContent[0]?.type === "title" ? currentContent[0] : undefined;
  const content = createContentMerge();

  if (previousTitle && currentTitle) {
    const title = mergeMatchedNode(previousTitle, currentTitle);

    appendContentMerge(content, title);
  } else {
    const title = currentTitle ?? previousTitle;

    if (title) {
      appendContentMerge(content, createNodeMerge(title, title));
    }
  }

  const blocks = mergeNodeSequence(
    previousTitle ? previousContent.slice(1) : previousContent,
    currentTitle ? currentContent.slice(1) : currentContent
  );

  appendContentMerge(content, blocks);

  return {
    current: finalizeDocument(content.current),
    inline: finalizeDocument(content.inline),
    previous: finalizeDocument(content.previous)
  };
};

export { createVersionComparison };
