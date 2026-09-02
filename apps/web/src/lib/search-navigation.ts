import type { EditorInstance } from "@andesine/editor";

interface SearchNavigationTarget {
  entryID: string;
  headingPath: string[];
  query: string;
  snippet: string;
}
interface SearchNavigationState {
  searchTarget?: SearchNavigationTarget;
}
interface SearchTextBlock {
  heading: boolean;
  position: number;
  text: string;
}

const normalizeSearchText = (value: string): string => {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
};
const getSnippetPhrases = (snippet: string): string[] => {
  const words = normalizeSearchText(snippet).split(" ").filter(Boolean);

  if (words.length < 5) return words.length > 0 ? [words.join(" ")] : [];

  return words.slice(0, -4).map((_, index) => words.slice(index, index + 5).join(" "));
};
const findPhrasePosition = (blocks: SearchTextBlock[], phrases: string[]): number | null => {
  return phrases.reduce<number | null>((match, phrase) => {
    if (match !== null) return match;

    return blocks.find(({ text }) => text.includes(phrase))?.position ?? null;
  }, null);
};
const findHeadingSectionPosition = (
  blocks: SearchTextBlock[],
  heading: string,
  phrases: string[]
): number | null => {
  let fallbackPosition: number | null = null;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (!block?.heading || block.text !== heading) continue;

    const nextHeadingIndex = blocks.findIndex((candidate, candidateIndex) => {
      return candidateIndex > index && candidate.heading;
    });
    const sectionBlocks = blocks.slice(
      index + 1,
      nextHeadingIndex < 0 ? undefined : nextHeadingIndex
    );
    const phrasePosition = findPhrasePosition(sectionBlocks, phrases);

    fallbackPosition ??= block.position;

    if (phrasePosition !== null) return phrasePosition;
  }

  return fallbackPosition;
};
const getSearchNavigationTarget = (state: unknown): SearchNavigationTarget | undefined => {
  if (!state || typeof state !== "object" || !("searchTarget" in state)) return;

  const { searchTarget } = state as SearchNavigationState;

  if (!searchTarget || typeof searchTarget.entryID !== "string") return;

  return searchTarget;
};
const scrollToSearchTarget = (editor: EditorInstance, target: SearchNavigationTarget): boolean => {
  const query = normalizeSearchText(target.query);
  const phrases = [query, ...getSnippetPhrases(target.snippet)].filter(
    (phrase) => phrase.length >= 2
  );
  const heading = normalizeSearchText(target.headingPath.at(-1) || "");
  const textBlocks: SearchTextBlock[] = [];

  editor.state.doc.descendants((node, position) => {
    if (!node.isTextblock) return;

    textBlocks.push({
      heading: node.type.name === "heading",
      position,
      text: normalizeSearchText(node.textContent)
    });
  });

  const firstHeadingIndex = textBlocks.findIndex(({ heading }) => heading);
  const rootSectionBlocks = textBlocks.slice(
    0,
    firstHeadingIndex < 0 ? undefined : firstHeadingIndex
  );
  const sectionPosition = heading
    ? findHeadingSectionPosition(textBlocks, heading, phrases)
    : findPhrasePosition(rootSectionBlocks, phrases);
  const position = sectionPosition ?? findPhrasePosition(textBlocks, phrases);

  if (position === null) return false;

  const element = editor.view.nodeDOM(position);

  if (!(element instanceof HTMLElement)) return false;

  element.scrollIntoView({ behavior: "smooth", block: "center" });

  return true;
};

export { getSearchNavigationTarget, scrollToSearchTarget };
export type { SearchNavigationState, SearchNavigationTarget };
