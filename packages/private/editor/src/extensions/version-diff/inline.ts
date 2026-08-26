import type { JSONContent } from "@tiptap/core";
import type { EditorDiffChange } from "../../client-types";
import { getComparableIdentity } from "./identity";

interface VersionDiffContent {
  attrs?: Record<string, unknown>;
  content?: VersionDiffContent[];
  diff?: EditorDiffChange["type"];
  marks?: JSONContent["marks"];
  text?: string;
  type?: string;
}
interface VersionDiffContentMerge {
  current: VersionDiffContent[];
  inline: VersionDiffContent[];
  previous: VersionDiffContent[];
}
interface IndexPair {
  current: number;
  previous: number;
}

interface InlineToken {
  identity: string;
  node: JSONContent;
  textIdentity: string;
}

const MAX_DIFF_MATRIX_SIZE = 100_000;
const REMOVED_ID_PREFIX = "version-diff-previous:";

const createContentMerge = (): VersionDiffContentMerge => ({
  current: [],
  inline: [],
  previous: []
});
const cloneNode = (
  node: JSONContent,
  diff?: EditorDiffChange["type"],
  namespaceIDs = false
): VersionDiffContent => {
  const attrs = node.attrs ? { ...node.attrs } : undefined;

  if (namespaceIDs && typeof attrs?.id === "string") {
    attrs.id = `${REMOVED_ID_PREFIX}${attrs.id}`;
  }

  return {
    attrs,
    content: node.content?.map((child) => cloneNode(child, undefined, namespaceIDs)),
    diff,
    marks: node.marks?.map((mark) => ({
      ...mark,
      attrs: mark.attrs ? { ...mark.attrs } : undefined
    })),
    text: node.text,
    type: node.type
  };
};
const getInlineTokens = (content: JSONContent[] = []) => {
  const tokens: InlineToken[] = [];

  for (const node of content) {
    if (node.type !== "text" || !node.text) {
      const identity = getComparableIdentity(node);

      tokens.push({ identity, node, textIdentity: identity });
      continue;
    }

    const parts = node.text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]+/gu) ?? [];

    for (const text of parts) {
      const tokenNode = { ...node, text };

      tokens.push({
        identity: getComparableIdentity(tokenNode),
        node: tokenNode,
        textIdentity: text
      });
    }
  }

  return tokens;
};
const getFallbackPairs = (
  previous: InlineToken[],
  current: InlineToken[],
  identity: keyof Pick<InlineToken, "identity" | "textIdentity">
) => {
  const pairs: IndexPair[] = [];
  let prefix = 0;
  let suffix = 0;

  while (
    prefix < previous.length &&
    prefix < current.length &&
    previous[prefix][identity] === current[prefix][identity]
  ) {
    pairs.push({ current: prefix, previous: prefix });
    prefix += 1;
  }

  while (
    suffix < previous.length - prefix &&
    suffix < current.length - prefix &&
    previous[previous.length - suffix - 1][identity] ===
      current[current.length - suffix - 1][identity]
  ) {
    suffix += 1;
  }

  for (let index = suffix; index > 0; index -= 1) {
    pairs.push({
      current: current.length - index,
      previous: previous.length - index
    });
  }

  return pairs;
};
const getStablePairs = (
  previous: InlineToken[],
  current: InlineToken[],
  identity: keyof Pick<InlineToken, "identity" | "textIdentity"> = "identity"
) => {
  if (previous.length * current.length > MAX_DIFF_MATRIX_SIZE) {
    return getFallbackPairs(previous, current, identity);
  }

  const lengths = Array.from(
    { length: previous.length + 1 },
    () => new Uint32Array(current.length + 1)
  );

  for (let previousIndex = previous.length - 1; previousIndex >= 0; previousIndex -= 1) {
    for (let currentIndex = current.length - 1; currentIndex >= 0; currentIndex -= 1) {
      lengths[previousIndex][currentIndex] =
        previous[previousIndex][identity] === current[currentIndex][identity]
          ? lengths[previousIndex + 1][currentIndex + 1] + 1
          : Math.max(
              lengths[previousIndex + 1][currentIndex],
              lengths[previousIndex][currentIndex + 1]
            );
    }
  }

  const pairs: IndexPair[] = [];
  let previousIndex = 0;
  let currentIndex = 0;

  while (previousIndex < previous.length && currentIndex < current.length) {
    if (previous[previousIndex][identity] === current[currentIndex][identity]) {
      pairs.push({ current: currentIndex, previous: previousIndex });
      previousIndex += 1;
      currentIndex += 1;
    } else if (
      lengths[previousIndex + 1][currentIndex] >= lengths[previousIndex][currentIndex + 1]
    ) {
      previousIndex += 1;
    } else {
      currentIndex += 1;
    }
  }

  return pairs;
};
const appendInlineNode = (content: VersionDiffContent[], node: VersionDiffContent) => {
  const previous = content.at(-1);
  const sameTextRun =
    previous?.type === "text" &&
    node.type === "text" &&
    previous.diff === node.diff &&
    JSON.stringify(previous.attrs) === JSON.stringify(node.attrs) &&
    JSON.stringify(previous.marks) === JSON.stringify(node.marks);

  if (sameTextRun) {
    previous.text = `${previous.text ?? ""}${node.text ?? ""}`;
  } else {
    content.push(node);
  }
};
const appendToken = (
  content: VersionDiffContent[],
  token: InlineToken,
  diff?: EditorDiffChange["type"]
) => {
  appendInlineNode(content, cloneNode(token.node, diff));
};
const getTokenLength = (token: InlineToken) => {
  return token.node.text === undefined ? 1 : token.node.text.replace(/\s/g, "").length;
};
const mergeInlineContent = (
  previousContent: JSONContent[] = [],
  currentContent: JSONContent[] = []
) => {
  const previous = getInlineTokens(previousContent);
  const current = getInlineTokens(currentContent);
  const pairs = getStablePairs(previous, current);
  const textPairs = getStablePairs(previous, current, "textIdentity");
  const result = createContentMerge();
  const previousLength = previous.reduce((length, token) => length + getTokenLength(token), 0);
  const currentLength = current.reduce((length, token) => length + getTokenLength(token), 0);
  const matchedLength = textPairs.reduce((length, pair) => {
    return length + getTokenLength(current[pair.current]);
  }, 0);
  const similarity = matchedLength / Math.max(previousLength, currentLength, 1);
  let previousIndex = 0;
  let currentIndex = 0;

  for (const pair of [...pairs, { current: current.length, previous: previous.length }]) {
    while (previousIndex < pair.previous) {
      appendToken(result.inline, previous[previousIndex], "removed");
      appendToken(result.previous, previous[previousIndex], "removed");
      previousIndex += 1;
    }

    while (currentIndex < pair.current) {
      appendToken(result.inline, current[currentIndex], "added");
      appendToken(result.current, current[currentIndex], "added");
      currentIndex += 1;
    }

    if (previousIndex < previous.length && currentIndex < current.length) {
      appendToken(result.inline, current[currentIndex]);
      appendToken(result.previous, previous[previousIndex]);
      appendToken(result.current, current[currentIndex]);
      previousIndex += 1;
      currentIndex += 1;
    }
  }

  return { ...result, similarity };
};

export { cloneNode, createContentMerge, mergeInlineContent };
export type { VersionDiffContent, VersionDiffContentMerge };
