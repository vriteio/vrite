import {
  Accessor,
  Component,
  JSX,
  ParentComponent,
  Setter,
  Show,
  createEffect,
  createSignal,
  on,
  onCleanup,
  splitProps,
  useContext
} from "solid-js";
import { scrollIntoView } from "seamless-scroll-polyfill";
import { createContext } from "solid-js";
import { debounce } from "@solid-primitives/scheduled";
import { marked } from "marked";
import { Dynamic } from "solid-js/web";
import type { Client, SearchResult } from "@vrite/sdk/api";

type SearchMode = "search" | "ask";

interface SearchContextData {
  mode: Accessor<SearchMode>;
  value: Accessor<string>;
  opened: Accessor<boolean>;
  hoverSelectEnabled: Accessor<boolean>;
  loading: Accessor<boolean>;
  inputElement: Accessor<HTMLInputElement | undefined>;
  answer: Accessor<JSX.Element>;
  results: Accessor<SearchResult[]>;
  selectedResult: Accessor<SearchResult | null>;
  setAnswer: Setter<JSX.Element>;
  setMode: Setter<SearchMode>;
  setValue: Setter<string>;
  setOpened: Setter<boolean>;
  setHoverSelectEnabled: Setter<boolean>;
  setLoading: Setter<boolean>;
  setInputElement: Setter<HTMLInputElement | undefined>;
  setSelectedResult: Setter<SearchResult | null>;
  actions: {
    onResultClick(searchResult: SearchResult): void;
    ask(): void;
  };
}
interface SearchRootProps {
  client: Client;
  contentGroupId?: string;
  contentPieceId?: string;
  variantId?: string;
  mode?: SearchMode;
  value?: string;
  opened?: boolean;
  setMode?(mode: SearchMode): void;
  setValue?(value: string): void;
  setOpened?(opened: boolean): void;
  onResultClick(searchResult: SearchResult): void;
}
interface SearchOverlayProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  as?:
    | keyof JSX.IntrinsicElements
    | Component<{
        onClick(event: MouseEvent & { currentTarget: HTMLElement; target: Element }): void;
      }>;
}
interface SearchTriggerProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  as?:
    | keyof JSX.IntrinsicElements
    | ParentComponent<{
        onClick(event: MouseEvent & { currentTarget: HTMLElement; target: Element }): void;
      }>;
}
interface SearchPaletteProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  as?:
    | keyof JSX.IntrinsicElements
    | ParentComponent<{
        onPointerMove(event: PointerEvent & { currentTarget: HTMLElement; target: Element }): void;
      }>;
}
interface SearchInputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "children" | "ref"> {
  as?:
    | "input"
    | "textarea"
    | Component<{
        value: string;
        ref(element: HTMLInputElement): void;
        onInput(
          event: InputEvent & { currentTarget: HTMLInputElement; target: HTMLInputElement }
        ): void;
        onKeyDown(
          event: KeyboardEvent & { currentTarget: HTMLInputElement; target: Element }
        ): void;
        onKeyUp(event: KeyboardEvent & { currentTarget: HTMLInputElement; target: Element }): void;
      }>;
}
interface SearchModeToggleProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  mode?: SearchMode;
  as?:
    | keyof JSX.IntrinsicElements
    | Component<{
        onClick(event: MouseEvent & { currentTarget: HTMLElement; target: Element }): void;
      }>;
  children: JSX.Element | Component<{ mode: SearchMode }>;
}
interface SearchResultsProps {
  children: Component<{
    results: SearchResult[];
    loading: boolean;
    isSelected(result: SearchResult): boolean;
  }>;
}
interface SearchResultItemProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  result: SearchResult;
  as?:
    | keyof JSX.IntrinsicElements
    | ParentComponent<{
        onClick(event: MouseEvent & { currentTarget: HTMLElement; target: Element }): void;
        onPointerEnter(event: PointerEvent & { currentTarget: HTMLElement; target: Element }): void;
      }>;
}
interface SearchAnswerProps {
  children: Component<{ answer: JSX.Element; loading: boolean }>;
}

const SearchContext = createContext<SearchContextData>();
const useSearch = (): SearchContextData => {
  return useContext(SearchContext)!;
};
const SearchRoot: ParentComponent<SearchRootProps> = (props) => {
  const [opened, setOpened] = createSignal(props.opened || false);
  const [value, setValue] = createSignal(props.value || "");
  const [mode, setMode] = createSignal<SearchMode>(props.mode || "search");
  const [answer, setAnswer] = createSignal<JSX.Element>("");
  const [results, setResults] = createSignal<SearchResult[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [hoverSelectEnabled, setHoverSelectEnabled] = createSignal(false);
  const [inputElement, setInputElement] = createSignal<HTMLInputElement | undefined>(undefined);
  const [selectedResult, setSelectedResult] = createSignal<SearchResult | null>(null);
  const [abortControllerRef, setAbortControllerRef] = createSignal<AbortController | null>(null);
  const ask = async (): Promise<void> => {
    let content = "";

    setLoading(true);
    props.client.useSignal(abortControllerRef()?.signal || null).ask({
      query: value(),
      contentGroupId: props.contentGroupId,
      contentPieceId: props.contentPieceId,
      variantId: props.variantId,
      onError(error) {
        setLoading(false);
        throw error;
      },
      onChunk(chunk) {
        setLoading(false);
        content += chunk;
        setAnswer(<div innerHTML={`${marked.parse(content, { gfm: true })}`} />);
      },
      onEnd() {
        setLoading(false);
      }
    });
  };
  const search = debounce(async () => {
    setResults([]);

    if (abortControllerRef()) abortControllerRef()?.abort();

    if (!value()) {
      setLoading(false);
      setResults([]);

      return;
    }

    setAbortControllerRef(new AbortController());

    try {
      const search = await props.client.useSignal(abortControllerRef()?.signal || null).search({
        query: value(),
        contentGroupId: props.contentGroupId
      });

      setResults(search);
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

  createEffect(
    on(
      value,
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
      setHoverSelectEnabled(false);
      setSelectedResult(null);
      setLoading(false);
      setAnswer("");
      setResults([]);
      setValue("");
    })
  );
  createEffect(() => {
    if (inputElement() && opened() && mode()) {
      setTimeout(() => {
        inputElement()?.focus();
      }, 300);
    }
  });
  createEffect(() => {
    import("tinykeys").then(({ createKeybindingsHandler }) => {
      const keyShortcutHandler = createKeybindingsHandler({
        "$mod+KeyK": () => {
          setOpened(!opened());
        },
        "escape": () => {
          if (!opened()) return;

          setOpened(false);
        },
        "ArrowUp": (event) => {
          if (!opened()) return;

          const selectedResultIndex = results().findIndex((result) => result === selectedResult());

          setHoverSelectEnabled(false);
          event.preventDefault();
          event.stopPropagation();

          if (selectedResultIndex > 0) {
            setSelectedResult(results()[selectedResultIndex - 1] || null);
            scrollToSelectedResult();
          } else if (mode() === "search") {
            setSelectedResult(results().at(-1) || null);
            scrollToSelectedResult(true);
          }
        },
        "ArrowDown": (event) => {
          if (!opened()) return;

          const selectedResultIndex = results().findIndex((result) => result === selectedResult());

          setHoverSelectEnabled(false);
          event.preventDefault();
          event.stopPropagation();

          if (mode() === "search" && selectedResultIndex < results().length - 1) {
            setSelectedResult(results()[selectedResultIndex + 1] || null);
            scrollToSelectedResult();
          } else {
            setSelectedResult(results()[0] || null);
            scrollToSelectedResult(true);
          }
        },
        "Enter": (event) => {
          if (!opened()) return;

          if (mode() === "search") {
            setOpened(false);

            if (selectedResult()) {
              props.onResultClick(selectedResult()!);
            }
          }
        }
      });

      window.addEventListener("keydown", keyShortcutHandler);
      onCleanup(() => {
        window.removeEventListener("keydown", keyShortcutHandler);
      });
    });
  });
  createEffect(() => {
    setOpened(props.opened || false);
  });
  createEffect(() => {
    props.setOpened?.(opened());
  });
  createEffect(() => {
    setValue(props.value || "");
  });
  createEffect(() => {
    props.setValue?.(value());
  });
  createEffect(() => {
    setMode(props.mode || "search");
  });
  createEffect(() => {
    props.setMode?.(mode());
  });

  return (
    <SearchContext.Provider
      value={{
        opened,
        mode,
        value,
        loading,
        inputElement,
        hoverSelectEnabled,
        answer,
        results,
        setOpened,
        setMode,
        setValue,
        setLoading,
        setInputElement,
        setAnswer,
        selectedResult,
        setHoverSelectEnabled,
        setSelectedResult,
        actions: {
          ask,
          onResultClick: props.onResultClick
        }
      }}
    >
      {props.children}
    </SearchContext.Provider>
  );
};
const SearchOverlay: Component<SearchOverlayProps> = (props) => {
  const { opened, setOpened } = useSearch();
  const [, passProps] = splitProps(props, ["as", "onClick"]);

  return (
    <Show when={opened()}>
      <Dynamic
        {...passProps}
        component={props.as || "div"}
        onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
          setOpened(false);

          if (typeof props.onClick === "function") {
            props.onClick(event);
          }
        }}
      />
    </Show>
  );
};
const SearchTrigger: ParentComponent<SearchTriggerProps> = (props) => {
  const { setOpened, inputElement } = useSearch();
  const [, passProps] = splitProps(props, ["as", "children", "onClick"]);

  return (
    <Dynamic
      {...passProps}
      component={props.as || "button"}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
        inputElement()?.focus({ preventScroll: true });
        setOpened(true);

        if (typeof props.onClick === "function") {
          props.onClick(event);
        }
      }}
    >
      {props.children}
    </Dynamic>
  );
};
const SearchPalette: ParentComponent<SearchPaletteProps> = (props) => {
  const { setHoverSelectEnabled } = useSearch();
  const [, passProps] = splitProps(props, ["as", "children", "onPointerMove"]);

  return (
    <Dynamic
      {...passProps}
      component={props.as || "div"}
      role="search"
      onPointerMove={(event: PointerEvent & { currentTarget: HTMLElement; target: Element }) => {
        setHoverSelectEnabled(true);

        if (typeof props.onPointerMove === "function") {
          props.onPointerMove(event);
        }
      }}
    >
      {props.children}
    </Dynamic>
  );
};
const SearchInput: Component<SearchInputProps> = (props) => {
  const { actions, mode, value, setMode, setValue, setAnswer, setLoading, setInputElement } =
    useSearch();
  const [, passProps] = splitProps(props, ["as", "onInput", "onKeyDown", "onKeyUp"]);

  return (
    <Dynamic
      {...passProps}
      component={props.as || "input"}
      value={value()}
      ref={(element: HTMLInputElement) => setInputElement(element)}
      role="searchbox"
      onInput={(
        event: InputEvent & { currentTarget: HTMLInputElement; target: HTMLInputElement }
      ) => {
        const element = event.target as HTMLInputElement;

        if (mode() === "search") {
          setLoading(true);
        }

        setValue(element.value);

        if (typeof props.onInput === "function") {
          props.onInput(event);
        }
      }}
      onKeyDown={(event: KeyboardEvent & { currentTarget: HTMLInputElement; target: Element }) => {
        if (event.key === "Backspace" && !value()) {
          setMode("search");
        }

        if (typeof props.onKeyDown === "function") {
          props.onKeyDown(event);
        }
      }}
      onKeyUp={(event: KeyboardEvent & { currentTarget: HTMLInputElement; target: Element }) => {
        if (event.key === "Enter" && mode() === "ask") {
          setLoading(true);
          setAnswer("");
          actions.ask();
        }

        if (typeof props.onKeyUp === "function") {
          props.onKeyUp(event);
        }
      }}
    />
  );
};
const SearchModeToggle: Component<SearchModeToggleProps> = (props) => {
  const { mode, setMode } = useSearch();
  const [, passProps] = splitProps(props, ["mode", "as", "children", "onClick"]);

  return (
    <Dynamic
      {...passProps}
      component={props.as || "button"}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
        setMode(props.mode || mode() === "search" ? "ask" : "search");

        if (typeof props.onClick === "function") {
          props.onClick(event);
        }
      }}
    >
      <Show when={typeof props.children === "function"} fallback={props.children as JSX.Element}>
        <Dynamic component={props.children as Component<{ mode: SearchMode }>} mode={mode()} />
      </Show>
    </Dynamic>
  );
};
const SearchResults: Component<SearchResultsProps> = (props) => {
  const { results, selectedResult, loading } = useSearch();

  return (
    <Dynamic
      component={props.children}
      results={results()}
      loading={loading()}
      isSelected={(result: SearchResult) => {
        return result === selectedResult();
      }}
    />
  );
};
const SearchResultItem: ParentComponent<SearchResultItemProps> = (props) => {
  const { actions, hoverSelectEnabled, setSelectedResult } = useSearch();
  const [, passProps] = splitProps(props, [
    "result",
    "children",
    "onClick",
    "onPointerEnter",
    "as"
  ]);

  return (
    <Dynamic
      {...passProps}
      component={props.as || "button"}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
        actions.onResultClick(props.result);

        if (typeof props.onClick === "function") {
          props.onClick?.(event);
        }
      }}
      onPointerEnter={(event: PointerEvent & { currentTarget: HTMLElement; target: Element }) => {
        if (!hoverSelectEnabled()) {
          if (typeof props.onPointerEnter === "function") {
            props.onPointerEnter(event);
          }

          return;
        }

        setSelectedResult(props.result);

        if (typeof props.onPointerEnter === "function") {
          props.onPointerEnter(event);
        }
      }}
    >
      {props.children}
    </Dynamic>
  );
};
const SearchAnswer: Component<SearchAnswerProps> = (props) => {
  const { mode, loading, answer } = useSearch();

  return (
    <Show when={mode() === "ask"}>
      <Dynamic component={props.children} answer={answer()} loading={loading()} />
    </Show>
  );
};
const Search = {
  Root: SearchRoot,
  Overlay: SearchOverlay,
  Palette: SearchPalette,
  ModeToggle: SearchModeToggle,
  Trigger: SearchTrigger,
  Input: SearchInput,
  Results: SearchResults,
  Result: SearchResultItem,
  Answer: SearchAnswer
};

export { Search };
