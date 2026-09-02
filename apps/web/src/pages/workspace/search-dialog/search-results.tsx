import { Skeleton } from "@andesine/components";
import clsx from "clsx";
import { type Component, For, type JSX, Show } from "solid-js";
import type { currentSearchQuery } from "#web/lib/data";

interface SearchResultContentProps {
  highlight?: string;
  icon: string | JSX.Element;
  iconClass?: string;
  label: string;
  sublabel?: string;
}
interface SearchResultItemProps extends SearchResultContentProps {
  disabled?: boolean;
  index: number;
  selected: boolean;
  onClick(): void;
  onSelect(): void;
}
interface SearchResultNoticeProps extends SearchResultContentProps {
  color?: "danger" | "neutral";
}
interface SearchResultLinkProps {
  icon: string | JSX.Element;
  label: string;
  onClick(): void;
}
interface SearchResultsSkeletonProps {
  preview?: boolean;
}
interface SearchResultsProps {
  query: string;
  results: Awaited<ReturnType<typeof currentSearchQuery>>["results"];
  selectedIndex: number;
  askAI(): void;
  openResult(result: Awaited<ReturnType<typeof currentSearchQuery>>["results"][number]): void;
  setSelectedIndex(index: number): void;
}
interface HighlightedTextProps {
  query: string;
  text: string;
}

type SearchResult = SearchResultsProps["results"][number];

const SEARCH_RESULT_MIN_HEIGHT = "2.75rem";
const SEARCH_RESULT_SKELETON_HEIGHT = "3.625rem";
const SEARCH_RESULT_SOURCE_HEIGHT = "1.75rem";
const SEARCH_RESULT_PREVIEW_LENGTH = 180;
const SEARCH_RESULT_PREVIEW_PREFIX_LENGTH = 24;
const SKELETON_WIDTHS = [
  { preview: "w-3/5", source: "w-28", title: "w-2/5" },
  { preview: "w-4/5", source: "w-40", title: "w-3/5" },
  { preview: "w-3/4", source: "w-36", title: "w-1/2" }
];
const SEARCH_RESULT_CLASS =
  "relative flex shrink-0 items-start gap-1 overflow-hidden rounded-lg py-1 pl-0.5 text-left font-medium";
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const getHighlightTerms = (query: string): string[] => {
  const phrase = query.trim().toLowerCase();

  if (!phrase) return [];

  return Array.from(
    new Set([phrase, ...phrase.split(/\s+/).filter((term) => term.length >= 2)])
  ).sort((left, right) => right.length - left.length);
};
const matchesQuery = (content: string, query: string): boolean => {
  const normalizedContent = content.toLowerCase();

  return getHighlightTerms(query).some((term) => normalizedContent.includes(term));
};
const getResultSublabel = (result: SearchResult, query: string): string => {
  const headingPath = result.headingPath.join(" › ");
  const headingMatches = headingPath && matchesQuery(headingPath, query);

  if (headingMatches && !matchesQuery(result.snippet, query)) return headingPath;

  return result.snippet;
};
const getContentPreview = (content: string, query: string): string => {
  const terms = getHighlightTerms(query);
  const normalizedContent = content.toLowerCase();
  const matchIndex = terms.reduce((firstIndex, term) => {
    const index = normalizedContent.indexOf(term);

    if (index < 0) return firstIndex;
    if (firstIndex < 0) return index;

    return Math.min(firstIndex, index);
  }, -1);
  const start = Math.max(matchIndex - SEARCH_RESULT_PREVIEW_PREFIX_LENGTH, 0);
  const end = Math.min(start + SEARCH_RESULT_PREVIEW_LENGTH, content.length);
  const preview = content.slice(start, end).trim();

  return `${start > 0 ? "…" : ""}${preview}${end < content.length ? "…" : ""}`;
};

const HighlightedText: Component<HighlightedTextProps> = (props) => {
  const terms = () => getHighlightTerms(props.query);
  const highlightedTerms = () => new Set(terms());
  const parts = () => {
    const currentTerms = terms();

    if (currentTerms.length === 0) return [props.text];

    return props.text.split(new RegExp(`(${currentTerms.map(escapeRegExp).join("|")})`, "giu"));
  };

  return (
    <For each={parts()}>
      {(part) => (
        <Show when={highlightedTerms().has(part.toLowerCase())} fallback={part}>
          <mark class="bg-transparent bg-gradient-to-tr bg-clip-text font-medium text-transparent from-secondary via-primary to-secondary">
            {part}
          </mark>
        </Show>
      )}
    </For>
  );
};
const SearchResultContent: Component<SearchResultContentProps> = (props) => (
  <>
    <div class="flex h-5 w-6 shrink-0 items-center justify-center">
      <Show
        when={typeof props.icon === "string" ? props.icon : undefined}
        keyed
        fallback={props.icon}
      >
        {(icon) => <div class={clsx("h-5 w-5", props.iconClass || "text-gray-400", icon)} />}
      </Show>
    </div>
    <div class="flex min-w-0 flex-1 flex-col leading-tight">
      <span class="line-clamp-1">{props.label}</span>
      <Show when={props.sublabel} keyed>
        {(sublabel) => (
          <span class="max-w-4/5 line-clamp-2 text-xs font-normal leading-tight text-gray-400">
            <Show when={props.highlight} keyed fallback={getContentPreview(sublabel, "")}>
              {(query) => (
                <HighlightedText query={query} text={getContentPreview(sublabel, query)} />
              )}
            </Show>
          </span>
        )}
      </Show>
    </div>
  </>
);
const SearchResultItem: Component<SearchResultItemProps> = (props) => (
  <button
    id={`workspace-search-result-${props.index}`}
    data-search-result={props.index}
    type="button"
    role="option"
    aria-disabled={props.disabled}
    aria-label={props.label}
    aria-selected={props.selected}
    class={clsx(
      SEARCH_RESULT_CLASS,
      "group w-full select-none media-mouse:cursor-pointer",
      props.selected && "md:bg-gradient-to-r md:from-gray-500/10 md:to-transparent",
      props.disabled && "text-gray-400"
    )}
    style={{ "min-height": SEARCH_RESULT_MIN_HEIGHT }}
    onPointerEnter={props.onSelect}
    onClick={props.onClick}
  >
    <SearchResultContent
      highlight={props.highlight}
      icon={props.icon}
      label={props.label}
      sublabel={props.sublabel}
    />
  </button>
);
const SearchResultLink: Component<SearchResultLinkProps> = (props) => (
  <button
    type="button"
    class={clsx(
      SEARCH_RESULT_CLASS,
      "group w-full select-none media-mouse:cursor-pointer media-mouse:hover:bg-gradient-to-r media-mouse:hover:from-gray-500/10 media-mouse:hover:to-transparent"
    )}
    onClick={props.onClick}
  >
    <SearchResultContent icon={props.icon} label={props.label} />
  </button>
);
const SearchResultNotice: Component<SearchResultNoticeProps> = (props) => (
  <div
    role="status"
    class={clsx(SEARCH_RESULT_CLASS, "w-full")}
    style={{ "min-height": SEARCH_RESULT_MIN_HEIGHT }}
  >
    <SearchResultContent
      icon={props.icon}
      iconClass={props.color === "danger" ? "text-red-400" : "text-gray-400"}
      label={props.label}
      sublabel={props.sublabel}
    />
  </div>
);
const SearchResultsSkeleton: Component<SearchResultsSkeletonProps> = (props) => (
  <div class="flex flex-col gap-0.5">
    <For each={SKELETON_WIDTHS}>
      {(widths) => (
        <div
          class="flex w-full items-start gap-1.5 px-1"
          style={{
            height:
              props.preview === false ? SEARCH_RESULT_SOURCE_HEIGHT : SEARCH_RESULT_SKELETON_HEIGHT
          }}
        >
          <div class="flex w-full items-start gap-1.5">
            <Skeleton class="h-5 w-5 rounded-md" />
            <div
              class={clsx(
                "flex flex-col gap-1.5",
                props.preview === false ? "max-w-[calc(100%_-_1.625rem)]" : "flex-1"
              )}
            >
              <Skeleton
                class={
                  props.preview === false
                    ? clsx("h-5 max-w-full rounded-md", widths.source)
                    : [
                        clsx("h-5 rounded-md", widths.title),
                        clsx("h-3.5 rounded-[0.25rem]", widths.preview)
                      ]
                }
              />
            </div>
          </div>
        </div>
      )}
    </For>
  </div>
);
const SearchResults: Component<SearchResultsProps> = (props) => {
  const askIndex = () => props.results.length;

  return (
    <Show
      when={props.results.length > 0 || props.query}
      fallback={
        <SearchResultNotice
          icon="i-lucide:search-x"
          label="No results"
          sublabel="Adjust your filters or enter a search query"
        />
      }
    >
      <div class="flex flex-col gap-0.5">
        <For each={props.results}>
          {(result, index) => (
            <SearchResultItem
              index={index()}
              icon="i-lucide:file-text"
              label={result.title || "Untitled"}
              sublabel={getResultSublabel(result, props.query)}
              highlight={props.query}
              selected={props.selectedIndex === index()}
              onSelect={() => props.setSelectedIndex(index())}
              onClick={() => props.openResult(result)}
            />
          )}
        </For>
        <Show when={props.query}>
          <SearchResultItem
            index={askIndex()}
            icon="i-material-symbols:magic-button-outline"
            label={`Tell me “${props.query}”`}
            sublabel="Ask a question..."
            selected={props.selectedIndex === askIndex()}
            onSelect={() => props.setSelectedIndex(askIndex())}
            onClick={props.askAI}
          />
        </Show>
      </div>
    </Show>
  );
};

export { SearchResultLink, SearchResultNotice, SearchResults, SearchResultsSkeleton };
