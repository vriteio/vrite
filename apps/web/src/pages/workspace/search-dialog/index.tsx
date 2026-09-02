import {
  createDebounced,
  createRef,
  createScrollShadowController,
  Dialog,
  Dropdown,
  Input,
  ScrollShadow
} from "@andesine/components";
import { createMediaQuery } from "@solid-primitives/media";
import { createAsync, useNavigate } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  Match,
  Show,
  Switch
} from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/api";
import { currentSearchQuery, type SearchPropertyFilter } from "#web/lib/data";
import type { SearchNavigationState } from "#web/lib/search-navigation";
import {
  AddSearchFilter,
  getSearchPropertyFilters,
  type PropertyFilterDraft,
  SearchFilters
} from "./search-filters";
import { SearchAnswerPanel, type SearchAnswerData } from "./search-answer";
import { SearchResultNotice, SearchResults, SearchResultsSkeleton } from "./search-results";

interface SearchDialogProps {
  opened: boolean;
  onClose(): void;
}
interface SearchResponse {
  error?: true;
  requestKey: string;
  results: Awaited<ReturnType<typeof currentSearchQuery>>["results"];
}
interface SearchRequest {
  filters: SearchPropertyFilter[];
  query: string;
}
interface AskRequest extends SearchRequest {
  requestID: number;
}

const EMPTY_SEARCH_RESPONSE: SearchResponse = { requestKey: "", results: [] };

const SearchDialog: Component<SearchDialogProps> = (props) => {
  const navigate = useNavigate();
  const { workspaceID } = useWorkspace();
  const md = createMediaQuery("(min-width: 768px)");
  const [inputRef, setInputRef] = createRef<HTMLInputElement | null>(null);
  const [resultsRef, setResultsRef] = createRef<HTMLDivElement>(null!);
  const [query, setQuery] = createSignal("");
  const [filterDrafts, setFilterDrafts] = createSignal<PropertyFilterDraft[]>([]);
  const [answer, setAnswer] = createSignal<SearchAnswerData>();
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [requestPending, setRequestPending] = createSignal(false);
  const [latestRequestID, setLatestRequestID] = createRef(0);
  const [askRequestID, setAskRequestID] = createRef(0);
  const scrollShadowController = createScrollShadowController();
  const normalizedQuery = () => query().trim();
  const activeFilters = createMemo(() => getSearchPropertyFilters(filterDrafts()));
  const searchRequest = createMemo<SearchRequest>(() => ({
    filters: activeFilters(),
    query: normalizedQuery()
  }));
  const debouncedSearchRequest = createDebounced(searchRequest, 250);
  const getRequestKey = (request: SearchRequest) => JSON.stringify(request);
  const focusInput = () => {
    if (!md()) return;

    queueMicrotask(() => inputRef()?.focus());
  };
  const searchResponse = createAsync(
    async (): Promise<SearchResponse> => {
      const request = debouncedSearchRequest();
      const currentWorkspaceID = workspaceID();
      const requestKey = getRequestKey(request);

      if (!currentWorkspaceID) return EMPTY_SEARCH_RESPONSE;

      const requestID = latestRequestID() + 1;

      setLatestRequestID(requestID);
      setRequestPending(true);

      try {
        const response = await currentSearchQuery({
          filters: request.filters,
          query: request.query,
          workspaceID: currentWorkspaceID
        });

        const nextResponse = { requestKey, results: response.results };

        return nextResponse;
      } catch (error) {
        const nextResponse: SearchResponse = { requestKey, results: [], error: true };

        console.error(error);

        return nextResponse;
      } finally {
        if (requestID === latestRequestID()) {
          setRequestPending(false);
        }
      }
    },
    { initialValue: EMPTY_SEARCH_RESPONSE }
  );
  const response = createMemo(() => {
    const latestResponse = searchResponse.latest;

    if (latestResponse.requestKey !== getRequestKey(searchRequest())) {
      return EMPTY_SEARCH_RESPONSE;
    }

    return latestResponse;
  });
  const results = () => response().results;
  const searching = () => {
    const currentRequest = searchRequest();

    return Boolean(
      getRequestKey(currentRequest) !== getRequestKey(debouncedSearchRequest()) || requestPending()
    );
  };
  const askMutation = createMutation(() => ({
    mutationFn: (request: AskRequest) => {
      return client.search.askCurrent({
        question: request.query,
        filters: request.filters,
        history: []
      });
    },
    onSuccess: (answer, request) => {
      if (request.requestID !== askRequestID()) return;

      setAnswer({ answer, question: request.query });

      if (normalizedQuery() === request.query) setQuery("");
      if (props.opened) focusInput();
    }
  }));
  const setQueryValue = (value: string) => {
    setQuery(value);
    setAskRequestID(askRequestID() + 1);
    if (value && answer()) setAnswer();

    if (!askMutation.isIdle && !askMutation.isPending) askMutation.reset();
  };
  const updateFilterDrafts = (filters: PropertyFilterDraft[]) => {
    setFilterDrafts(filters);
    setAnswer();
    setAskRequestID(askRequestID() + 1);

    if (!askMutation.isIdle) askMutation.reset();
  };
  const openResult = (result: SearchResponse["results"][number]) => {
    const state: SearchNavigationState = {
      searchTarget: {
        entryID: result.entryID,
        headingPath: result.headingPath,
        query: normalizedQuery(),
        snippet: result.snippet
      }
    };

    navigate(`/${workspaceID()}/${result.entryID}`, { state });
    props.onClose();
  };
  const submitQuestion = () => {
    const question = normalizedQuery();

    if (!question || askMutation.isPending) return;

    setAnswer();
    askMutation.mutate({
      filters: activeFilters(),
      query: question,
      requestID: askRequestID()
    });
    setQuery("");
  };
  const selectResult = (index: number) => {
    setSelectedIndex(index);
    queueMicrotask(() => {
      resultsRef()
        .querySelector(`[data-search-result="${index}"]`)
        ?.scrollIntoView({ block: "nearest" });
    });
  };
  const scrollAnswerToEnd = () => {
    queueMicrotask(() => {
      const container = resultsRef();

      container.scrollTop = container.scrollHeight;
    });
  };
  const handleInputKeyDown = (event: KeyboardEvent) => {
    const lastResultIndex = Math.max(results().length - (normalizedQuery() ? 0 : 1), 0);

    event.stopPropagation();

    if (!md() && event.key === "Enter") {
      event.preventDefault();
      inputRef()?.blur();

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      selectResult(Math.min(selectedIndex() + 1, lastResultIndex));

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      selectResult(Math.max(selectedIndex() - 1, 0));

      return;
    }

    if (event.key === "Enter") {
      const selectedResult = results()[selectedIndex()];

      if (selectedResult) {
        event.preventDefault();
        openResult(selectedResult);
      } else if (selectedIndex() === results().length && normalizedQuery()) {
        event.preventDefault();
        submitQuestion();
      }
    }
  };

  createEffect(() => {
    if (props.opened) {
      focusInput();
    }
  });
  createEffect(() => {
    searchRequest();
    setSelectedIndex(0);
  });
  createEffect(() => {
    if (answer() || askMutation.isPending) {
      scrollAnswerToEnd();
    }
  });
  createEffect(() => {
    response();
    answer();
    Boolean(askMutation.isPending);
    Boolean(askMutation.isError);

    queueMicrotask(() => scrollShadowController.processScrollState());
  });

  const content = () => (
    <div class="flex min-h-0 w-full flex-1 flex-col gap-2">
      <div class="flex shrink-0 items-center gap-1 px-1 pt-1">
        <Input
          ref={(input) => {
            setInputRef(input);
            if (props.opened) focusInput();
          }}
          value={query()}
          setValue={setQueryValue}
          placeholder="Search or ask a question"
          aria-label="Search query"
          size="small"
          maxLength={500}
          onKeyDown={handleInputKeyDown}
          role="combobox"
          class="bg-transparent focus:shadow-none"
          aria-autocomplete="list"
          aria-controls="workspace-search-results"
          aria-expanded={props.opened}
          aria-activedescendant={
            !searching() && !response().error && (normalizedQuery() || results().length > 0)
              ? `workspace-search-result-${selectedIndex()}`
              : undefined
          }
        />
        <AddSearchFilter filters={filterDrafts()} setFilters={updateFilterDrafts} />
      </div>
      <SearchFilters filters={filterDrafts()} setFilters={updateFilterDrafts} />
      <div class="relative flex min-h-0 flex-1 overflow-hidden">
        <ScrollShadow controller={scrollShadowController} scrollableContainerRef={resultsRef} />
        <div
          id="workspace-search-results"
          ref={setResultsRef}
          role="listbox"
          aria-busy={askMutation.isPending || searching()}
          class="relative z-0 flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-1 pb-1 md:max-h-[min(60dvh,32rem)]"
        >
          <Switch>
            <Match
              when={
                !normalizedQuery() && (answer() || askMutation.isPending || askMutation.isError)
              }
            >
              <SearchAnswerPanel
                data={answer()}
                loading={askMutation.isPending}
                error={askMutation.isError ? askMutation.error : undefined}
                openResult={openResult}
                question={askMutation.variables?.query}
              />
            </Match>
            <Match when={searching()}>
              <SearchResultsSkeleton />
            </Match>
            <Match when={response().error}>
              <SearchResultNotice
                color="danger"
                icon="i-lucide:triangle-alert"
                label="Search is unavailable"
                sublabel="Check your connection and try again"
              />
            </Match>
            <Match when={!searching()}>
              <SearchResults
                query={normalizedQuery()}
                results={results()}
                selectedIndex={selectedIndex()}
                setSelectedIndex={setSelectedIndex}
                openResult={openResult}
                askAI={submitQuestion}
              />
            </Match>
          </Switch>
        </div>
      </div>
    </div>
  );

  return (
    <Show
      when={md()}
      fallback={
        <Dropdown
          title="Search"
          class="md:hidden"
          anchorPoint={{ x: 0, y: 0 }}
          mobileSheetDragFromContent={false}
          opened={props.opened}
          setOpened={(opened) => {
            if (!opened) props.onClose();
          }}
          cardProps={{ style: { "min-height": "60dvh" } }}
          portal
        >
          {content()}
        </Dropdown>
      }
    >
      <Dialog
        opened={props.opened}
        onOverlayClick={props.onClose}
        backdrop={false}
        size="xlarge"
        cardClass="max-h-[80dvh] p-1 gap-2"
        wrapperClass="absolute top-[10dvh]"
        aria-label="Search workspace"
        portal
      >
        {content()}
      </Dialog>
    </Show>
  );
};

export { SearchDialog };
