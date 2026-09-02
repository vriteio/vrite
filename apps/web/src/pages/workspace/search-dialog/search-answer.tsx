import { Skeleton } from "@andesine/components";
import { type Component, For, Show } from "solid-js";
import { Markdown } from "#web/components/markdown";
import type { client } from "#web/lib/api";
import { SearchResultLink } from "./search-results";

interface SearchAnswerData {
  answer: Awaited<ReturnType<typeof client.search.askCurrent>>;
  question: string;
}

interface SearchAnswerProps extends SearchAnswerData {
  openResult(result: Awaited<ReturnType<typeof client.search.askCurrent>>["sources"][number]): void;
}
interface SearchAnswerPanelProps {
  data?: SearchAnswerData;
  error?: unknown;
  loading: boolean;
  openResult: SearchAnswerProps["openResult"];
  question?: string;
}
interface SearchAnswerSkeletonProps {
  question: string;
}
interface SearchErrorProps {
  message: string;
  title: string;
}

const getErrorMessage = (error: unknown): string | undefined => {
  if (!error) return;

  return error instanceof Error && error.message
    ? error.message
    : "Ask AI is unavailable. Try again later.";
};
const linkAnswerReferences = (answer: SearchAnswerProps["answer"]): string => {
  const sourceIDs = new Set(answer.sources.map(({ id }) => String(id)));

  return answer.answer.replace(/\[(\d+)\](?!\()/g, (reference, id: string) => {
    if (!sourceIDs.has(id)) return reference;

    return `[${reference}](#ask-ai-source-${id})`;
  });
};
const SearchError: Component<SearchErrorProps> = (props) => (
  <div class="flex min-h-24 flex-col items-center justify-center gap-2 text-center">
    <div class="h-6 w-6 text-red-400 i-lucide:triangle-alert" />
    <div class="flex flex-col gap-0.5">
      <p class="text-sm font-medium">{props.title}</p>
      <p class="max-w-sm text-xs text-gray-400">{props.message}</p>
    </div>
  </div>
);

const SearchAnswer: Component<SearchAnswerProps> = (props) => (
  <div class="flex flex-col gap-2">
    <div class="flex justify-end">
      <p class="max-w-9/10 whitespace-pre-wrap rounded-lg bg-gray-100 px-2 py-1 text-sm leading-relaxed">
        {props.question}
      </p>
    </div>
    <div class="flex items-start gap-2 max-w-9/10">
      <Markdown
        class="min-w-0 flex-1 ![&>*:first-child]:mt-0 ![&>*:last-child]:mb-0"
        content={linkAnswerReferences(props.answer)}
        onLinkClick={(href, event) => {
          const sourceID = Number(href.match(/^#ask-ai-source-(\d+)$/)?.[1]);
          const source = props.answer.sources.find(({ id }) => id === sourceID);

          if (!source) return;

          event.preventDefault();
          props.openResult(source);
        }}
      />
    </div>
    <Show when={props.answer.sources.length > 0}>
      <div class="flex flex-col gap-0.5">
        <For each={props.answer.sources}>
          {(source) => (
            <SearchResultLink
              icon={
                <span class="flex h-5 w-full items-center justify-center font-mono text-xs text-gray-400">
                  [{source.id}]
                </span>
              }
              label={source.title || "Untitled"}
              onClick={() => props.openResult(source)}
            />
          )}
        </For>
      </div>
    </Show>
  </div>
);
const SearchAnswerSkeleton: Component<SearchAnswerSkeletonProps> = (props) => (
  <div class="flex flex-col gap-2">
    <div class="flex justify-end">
      <p class="max-w-9/10 whitespace-pre-wrap rounded-lg bg-gray-100 px-2 py-1 text-sm leading-relaxed">
        {props.question}
      </p>
    </div>
    <div class="relative flex w-full flex-col gap-2 overflow-hidden">
      <Skeleton class="h-24 w-full max-w-9/10" />
      <div class="flex flex-col gap-1.5">
        <Skeleton class={["h-6 w-3/5", "h-6 w-4/5", "h-6 w-1/2"]} />
      </div>
      <div
        class="pointer-events-none absolute inset-0 text-gray-50 hidden md:block"
        style={{ background: "linear-gradient(to bottom, transparent 15%, currentColor 100%)" }}
      />
    </div>
  </div>
);
const SearchAnswerPanel: Component<SearchAnswerPanelProps> = (props) => (
  <div class="flex flex-col gap-2">
    <Show when={props.data} keyed>
      {(data) => (
        <SearchAnswer answer={data.answer} question={data.question} openResult={props.openResult} />
      )}
    </Show>
    <Show when={props.loading}>
      <SearchAnswerSkeleton question={props.question || ""} />
    </Show>
    <Show when={getErrorMessage(props.error)} keyed>
      {(error) => <SearchError title="Ask AI failed" message={error} />}
    </Show>
  </div>
);

export { SearchAnswerPanel };
export type { SearchAnswerData };
