import {
  Accessor,
  Component,
  For,
  Match,
  ParentComponent,
  Setter,
  Show,
  Switch,
  createEffect,
  createSignal,
  on,
  onCleanup,
  useContext
} from "solid-js";
import {
  mdiChevronRight,
  mdiCreationOutline,
  mdiFileDocumentOutline,
  mdiHeadSnowflakeOutline,
  mdiInformationOutline,
  mdiKeyboardEsc,
  mdiKeyboardReturn,
  mdiMagnify,
  mdiSwapVertical
} from "@mdi/js";
import clsx from "clsx";
import { scrollIntoView } from "seamless-scroll-polyfill";
import { createContext } from "solid-js";
import { debounce } from "@solid-primitives/scheduled";
import { convert as convertToSlug } from "url-slug";
import { marked } from "marked";
import { createClient, SearchResult } from "@vrite/sdk/api";
import {
  Button,
  Card,
  Icon,
  IconButton,
  Input,
  Loader,
  Overlay,
  Tooltip
} from "#components/primitives";

interface SearchPaletteProps {
  opened: boolean;
  setOpened(opened: boolean): void;
}
interface SearchPaletteContextData {
  opened: Accessor<boolean>;
  setOpened: Setter<boolean>;
}

const SearchPaletteContext = createContext<SearchPaletteContextData>();
const SearchPalette: Component<SearchPaletteProps> = (props) => {
  const client = createClient({
    token: import.meta.env.PUBLIC_VRITE_SEARCH_TOKEN
  });
  const [inputRef, setInputRef] = createSignal<HTMLInputElement | null>(null);
  const [abortControllerRef, setAbortControllerRef] = createSignal<AbortController | null>(null);
  const [mode, setMode] = createSignal<"search" | "ask">("search");
  const [searchResults, setSearchResults] = createSignal<SearchResult[]>([]);
  const [answer, setAnswer] = createSignal<string>("");
  const [loading, setLoading] = createSignal(false);
  const [mouseHoverEnabled, setMouseHoverEnabled] = createSignal(false);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [query, setQuery] = createSignal("");
  const ask = async (): Promise<void> => {
    let content = "";

    client.useSignal(abortControllerRef()?.signal || null).ask({
      query: query(),
      onError(error) {
        setLoading(false);
        throw error;
      },
      onChunk(chunk) {
        content += chunk;
        setAnswer(marked.parse(content, { gfm: true }));
      },
      onEnd() {
        setLoading(false);
      }
    });
    setLoading(false);
  };
  const search = debounce(async () => {
    setSearchResults([]);

    if (abortControllerRef()) abortControllerRef()?.abort();

    if (!query()) {
      setLoading(false);
      setSearchResults([]);

      return;
    }

    setAbortControllerRef(new AbortController());

    try {
      const search = await client
        .useSignal(abortControllerRef()?.signal || null)
        .search({ query: query() });

      setSearchResults(search);
      setLoading(false);

      return;
    } catch (error) {
      const trpcError = error as any;
      const causeErrorName = trpcError.cause?.name?.toLowerCase() || "";

      if (!causeErrorName.includes("aborterror") && abortControllerRef()?.signal.aborted) {
        setLoading(false);
      }
    }
  }, 150);
  const scrollToSelectedResult = (smooth?: boolean): void => {
    const selectedResultElement = document.querySelector("[data-selected=true]");

    if (selectedResultElement) {
      scrollIntoView(selectedResultElement, {
        behavior: smooth ? "smooth" : "instant",
        block: "center"
      });
    }
  };
  const goToContentPiece = (searchResult: SearchResult): void => {
    // eslint-disable-next-line no-console
    props.setOpened(false);

    const { slug } = searchResult.contentPiece;
    const [title, subHeading1, subHeading2] = searchResult.breadcrumb;

    window.location.href = `/${slug.startsWith("/") ? slug.slice(1) : slug}#${convertToSlug(
      subHeading2 || subHeading1
    )}`;
  };

  createEffect(
    on(
      query,
      () => {
        if (mode() === "search") {
          search.clear();
          search();
        }
      },
      { defer: true }
    )
  );
  createEffect(
    on(mode, () => {
      setMouseHoverEnabled(false);
      setSelectedIndex(0);
      setLoading(false);
      setAnswer("");
      setSearchResults([]);
      setQuery("");
    })
  );
  createEffect(() => {
    if (inputRef() && props.opened && mode()) {
      setTimeout(() => {
        inputRef()?.focus();
      }, 300);
    }
  });
  createEffect(() => {
    import("tinykeys").then(({ createKeybindingsHandler }) => {
      const keyShortcutHandler = createKeybindingsHandler({
        "$mod+KeyK": (event) => {
          props.setOpened(!props.opened);
        },
        "escape": (event) => {
          if (!props.opened) return;

          props.setOpened(false);
        },
        "ArrowUp": (event) => {
          if (!props.opened) return;

          setMouseHoverEnabled(false);
          event.preventDefault();
          event.stopPropagation();

          if (selectedIndex() > 0) {
            setSelectedIndex(selectedIndex() - 1);
            scrollToSelectedResult();
          } else if (mode() === "search") {
            setSelectedIndex(searchResults().length - 1);
            scrollToSelectedResult(true);
          }
        },
        "ArrowDown": (event) => {
          if (!props.opened) return;

          setMouseHoverEnabled(false);
          event.preventDefault();
          event.stopPropagation();

          if (mode() === "search" && selectedIndex() < searchResults().length - 1) {
            setSelectedIndex(selectedIndex() + 1);
            scrollToSelectedResult();
          } else {
            setSelectedIndex(0);
            scrollToSelectedResult(true);
          }
        },
        "Enter": (event) => {
          if (!props.opened) return;

          if (mode() === "search") {
            goToContentPiece(searchResults()[selectedIndex()]);
          }
        }
      });

      window.addEventListener("keydown", keyShortcutHandler);
      onCleanup(() => {
        window.removeEventListener("keydown", keyShortcutHandler);
      });
    });
  });

  const getIcon = (): string => {
    switch (mode()) {
      case "search":
        return mdiMagnify;
      case "ask":
        return mdiHeadSnowflakeOutline;
    }
  };
  const getLabel = (): string => {
    switch (mode()) {
      case "ask":
        return "Just ask";
      case "search":
      default:
        return "Search";
    }
  };

  return (
    <Overlay
      opened={props.opened}
      class="items-start"
      shadeClass="bg-opacity-50"
      wrapperClass="mt-32"
      onOverlayClick={() => {
        props.setOpened(false);
      }}
    >
      <Card
        class="w-2xl max-w-[calc(100vw-2rem)] max-h-[calc(100vh-16rem)] flex flex-col p-0 overflow-hidden shadow-xl"
        color="base"
        onPointerMove={() => {
          setMouseHoverEnabled(true);
        }}
      >
        <div class="flex w-full justify-center items-center p-2 border-b-2 dark:border-gray-700">
          <IconButton path={getIcon()} text="soft" variant="text" badge hover={false} class="m-0" />
          <Input
            value={query()}
            setValue={(value) => {
              if (mode() === "search") {
                setLoading(true);
              }

              setQuery(value);
            }}
            ref={setInputRef}
            tabIndex={0}
            placeholder={getLabel()}
            wrapperClass="flex-1 m-0"
            class="m-0 bg-transparent"
            onEnter={() => {
              if (mode() === "ask") {
                setLoading(true);
                setAnswer("");
                ask();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !query()) {
                setMode("search");
              }
            }}
            adornment={() => (
              <Show when={mode() === "search" || mode() === "ask"}>
                <Tooltip text="Ask" side="left" class="-ml-1">
                  <IconButton
                    path={mdiCreationOutline}
                    class="m-0"
                    text={mode() === "ask" ? "base" : "soft"}
                    color={mode() === "ask" ? "primary" : "base"}
                    onClick={() => {
                      setMode((mode) => (mode === "ask" ? "search" : "ask"));
                    }}
                    variant="text"
                  />
                </Tooltip>
              </Show>
            )}
          />
        </div>
        <div class="relative overflow-hidden">
          <div class="flex-1 flex flex-col overflow-auto  max-h-[calc(100vh-21.5rem)] scrollbar-sm">
            <Switch>
              <Match when={mode() === "search"}>
                <Show
                  when={!loading()}
                  fallback={
                    <div class="flex justify-center items-center p-4">
                      <Loader />
                    </div>
                  }
                >
                  <For
                    each={searchResults()}
                    fallback={
                      <span class="p-4 text-center text-gray-500 dark:text-gray-400">
                        <Show when={query()} fallback="Type to search">
                          No results
                        </Show>
                      </span>
                    }
                  >
                    {(result, index) => {
                      return (
                        <Card
                          class={clsx(
                            "flex justify-start items-center py-2 px-3 m-0 rounded-none border-none",
                            index() === selectedIndex() &&
                              "bg-gray-300 dark:bg-gray-700 cursor-pointer",
                            index() !== selectedIndex() && "bg-transparent"
                          )}
                          color="base"
                          onClick={() => {
                            goToContentPiece(result);
                          }}
                          onPointerEnter={() => {
                            if (!mouseHoverEnabled()) return;

                            setSelectedIndex(index());
                          }}
                        >
                          <div class="flex w-full">
                            <Icon
                              path={mdiFileDocumentOutline}
                              class="h-6 w-6 mr-2 justify-start items-center"
                            />
                            <div class="flex flex-col justify-start flex-1">
                              <p class="flex items-center justify-start flex-wrap font-semibold">
                                <For each={result.breadcrumb}>
                                  {(breadcrumb, index) => {
                                    return (
                                      <>
                                        <Show when={index()}>
                                          <Icon
                                            path={mdiChevronRight}
                                            class="flex-inline h-5 w-5 text-gray-500 dark:text-gray-400"
                                          />
                                        </Show>
                                        {breadcrumb}
                                      </>
                                    );
                                  }}
                                </For>
                              </p>
                              <p class="prose flex-1 text-sm clamp-2 whitespace-pre-wrap text-gray-500 dark:text-gray-400">
                                {result.content}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    }}
                  </For>
                </Show>
              </Match>
              <Match when={mode() === "ask"}>
                <Show
                  when={answer()}
                  fallback={
                    <Show
                      when={!loading()}
                      fallback={
                        <div class="flex justify-center items-center p-4">
                          <Loader />
                        </div>
                      }
                    >
                      <span class="p-4 text-center text-gray-500 dark:text-gray-400">
                        What do you want to know?
                      </span>
                    </Show>
                  }
                >
                  <Card
                    class={clsx(
                      "flex flex-col items-center py-2 px-3 m-0 rounded-none border-none"
                    )}
                    color="base"
                  >
                    <div
                      class="flex flex-col w-full prose whitespace-pre-wrap"
                      innerHTML={answer()}
                    />
                    <Show when={!loading()}>
                      <IconButton
                        color="contrast"
                        text="soft"
                        size="small"
                        badge
                        class="mt-4"
                        path={mdiInformationOutline}
                        label="The information produced may be inaccurate."
                      />
                    </Show>
                  </Card>
                </Show>
              </Match>
            </Switch>
          </div>
        </div>
        <div class="border-t-2 dark:border-gray-700 px-2 py-1 flex gap-2 bg-gray-100 dark:bg-gray-800">
          <div class="hidden md:flex gap-2">
            <IconButton
              path={mdiSwapVertical}
              hover={false}
              badge
              label="Select"
              size="small"
              variant="text"
              text="soft"
            />
            <IconButton
              path={mdiKeyboardReturn}
              hover={false}
              badge
              label="Open"
              size="small"
              variant="text"
              text="soft"
            />
            <IconButton
              path={mdiKeyboardEsc}
              hover={false}
              badge
              label="Close"
              size="small"
              variant="text"
              text="soft"
            />
          </div>
          <div class="flex-1" />
          <Button
            size="small"
            variant="text"
            color={mode() === "ask" ? "primary" : "base"}
            text={mode() === "ask" ? "base" : "soft"}
            onClick={() => {
              setMode((mode) => (mode === "search" ? "ask" : "search"));
            }}
          >
            Ask a question
          </Button>
        </div>
      </Card>
    </Overlay>
  );
};
const SearchPaletteProvider: ParentComponent = (props) => {
  const [opened, setOpened] = createSignal(false);

  createEffect(() => {
    if (opened()) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  });

  return (
    <SearchPaletteContext.Provider
      value={{
        opened,
        setOpened
      }}
    >
      {props.children}
      <SearchPalette opened={opened()} setOpened={setOpened} />
    </SearchPaletteContext.Provider>
  );
};
const useSearchPalette = (): SearchPaletteContextData => {
  return useContext(SearchPaletteContext)!;
};

export { SearchPaletteProvider, useSearchPalette };
