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
  createMemo,
  createSignal,
  on,
  onCleanup,
  useContext
} from "solid-js";
import {
  mdiChevronRight,
  mdiConsoleLine,
  mdiCreationOutline,
  mdiFileDocumentOutline,
  mdiHeadSnowflakeOutline,
  mdiInformationOutline,
  mdiKeyboardEsc,
  mdiKeyboardReturn,
  mdiMagnify,
  mdiSwapVertical
} from "@mdi/js";
import { tinykeys } from "tinykeys";
import clsx from "clsx";
import { scrollIntoView } from "seamless-scroll-polyfill";
import { createContext } from "solid-js";
import { debounce } from "@solid-primitives/scheduled";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { marked } from "marked";
import { useNavigate } from "@solidjs/router";
import { Dynamic } from "solid-js/web";
import { ScrollShadow } from "#components/fragments";
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
import { App, useClient } from "#context/client";
import { useLocalStorage } from "#context/local-storage";
import { breakpoints } from "#lib/utils";
import { useHostConfig } from "#context/host-config";

interface CommandCategory {
  label: string;
  id: string;
}
interface Command {
  name: string;
  category?: string;
  icon?: string;
  subCommands?: Array<Omit<Command, "menu">>;
  render?: Component<{
    selected?: boolean;
    command: Command;
  }>;
  action?(): void;
}
type CommandPaletteMode = "command" | "search" | "ask";

interface CommandPaletteProps {
  opened: boolean;
  mode: CommandPaletteMode;
  commands: Command[];
  openedCommand: Command | null;
  setOpened: Setter<boolean>;
  setMode: Setter<CommandPaletteMode>;
  setOpenedCommand: Setter<Command | null>;
}

interface CommandPaletteContextData {
  opened: Accessor<boolean>;
  registerCommand(command: Command | Command[]): void;
  open(mode?: CommandPaletteMode, openedCommand?: Command | null): void;
  close(): void;
}

const categories: CommandCategory[] = [
  {
    label: "Navigate",
    id: "navigate"
  },
  {
    label: "Dashboard",
    id: "dashboard"
  },
  {
    label: "Editor",
    id: "editor"
  },
  {
    label: "Workspace",
    id: "workspace"
  }
];
const CommandPaletteContext = createContext<CommandPaletteContextData>();
const CommandPalette: Component<CommandPaletteProps> = (props) => {
  const hostConfig = useHostConfig();
  const client = useClient();

  window.client = client;

  const navigate = useNavigate();
  const { setStorage } = useLocalStorage();
  const [inputRef, setInputRef] = createSignal<HTMLInputElement | null>(null);
  const [abortControllerRef, setAbortControllerRef] = createSignal<AbortController | null>(null);
  const [searchResults, setSearchResults] = createSignal<
    Array<{ content: string; breadcrumb: string[]; contentPieceId: string }>
  >([]);
  const [answer, setAnswer] = createSignal<string>("");
  const [loading, setLoading] = createSignal(false);
  const [scrollableContainerRef, setScrollableContainerRef] = createSignal<HTMLDivElement | null>(
    null
  );
  const [mouseHoverEnabled, setMouseHoverEnabled] = createSignal(false);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [query, setQuery] = createSignal("");
  const ask = async (): Promise<void> => {
    let content = "";

    await fetchEventSource(`${window.env.PUBLIC_API_URL}/search/ask/?query=${query()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
      },
      credentials: "include",
      signal: abortControllerRef()?.signal,
      onerror(error) {
        setLoading(false);
        throw error;
      },
      onmessage(event) {
        const partOfContent = decodeURIComponent(event.data);

        content += partOfContent;
        setAnswer(marked.parse(content, { gfm: true, headerIds: false, mangle: false }));
      },
      onclose() {
        setLoading(false);
      }
    });
    setLoading(false);
  };
  const search = debounce(async () => {
    setSearchResults([]);

    if (!query()) {
      setLoading(false);

      return;
    }

    if (abortControllerRef()) abortControllerRef()?.abort();

    setAbortControllerRef(new AbortController());

    try {
      const results = await client.search.search.query(
        { query: query() },
        { signal: abortControllerRef()?.signal }
      );

      setSearchResults(results);
      setLoading(false);

      return;
    } catch (error) {
      const trpcError = error as App.ClientError;
      const causeErrorName = trpcError.cause?.name?.toLowerCase() || "";

      if (!causeErrorName.includes("aborterror")) {
        setLoading(false);
      }
    }
  }, 150);
  const filteredCommands = createMemo(() => {
    // Sort commands by categories
    const sortedCommands = [null, ...categories].flatMap((category) => {
      return (props.openedCommand?.subCommands || props.commands).filter((command) => {
        if (!category) return !command.category;

        return command.category === category?.id;
      });
    });

    return sortedCommands.filter(({ name }) => {
      return name.toLowerCase().includes(query().toLowerCase());
    });
  });
  const selectedCommand = (): Command | null => {
    return filteredCommands()[selectedIndex()] || null;
  };
  const scrollToSelectedCommand = (smooth?: boolean): void => {
    const selectedCommandElement = document.querySelector("[data-selected=true]");

    if (selectedCommandElement) {
      scrollIntoView(selectedCommandElement, {
        behavior: smooth ? "smooth" : "instant",
        block: "center"
      });
    }
  };
  const goToContentPiece = (contentPieceId: string, breadcrumb?: string[]): void => {
    setStorage((storage) => ({
      ...storage,
      sidePanelWidth: breakpoints.md() ? storage.sidePanelWidth || 375 : 0,
      sidePanelView: "contentPiece",
      contentPieceId
    }));
    navigate("/editor", { state: { breadcrumb } });
    props.setOpened(false);
  };
  const unsubscribeTinykeys = tinykeys(window, {
    "$mod+KeyK": (event) => {
      props.setMode(hostConfig.search ? "search" : "command");
      props.setOpenedCommand(null);
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
        scrollToSelectedCommand();
      } else if (props.mode === "command") {
        setSelectedIndex(filteredCommands().length - 1);
        scrollToSelectedCommand(true);
      } else if (props.mode === "search") {
        setSelectedIndex(searchResults().length - 1);
        scrollToSelectedCommand(true);
      }
    },
    "ArrowDown": (event) => {
      if (!props.opened) return;

      setMouseHoverEnabled(false);
      event.preventDefault();
      event.stopPropagation();

      if (
        (props.mode === "command" && selectedIndex() < filteredCommands().length - 1) ||
        (props.mode === "search" && selectedIndex() < searchResults().length - 1)
      ) {
        setSelectedIndex(selectedIndex() + 1);
        scrollToSelectedCommand();
      } else {
        setSelectedIndex(0);
        scrollToSelectedCommand(true);
      }
    },
    "Enter": () => {
      if (!props.opened) return;

      if (props.mode === "command") {
        const selectedCommand = filteredCommands()[selectedIndex()];

        if (selectedCommand) {
          if (selectedCommand.action) {
            selectedCommand.action();
            props.setOpened(false);
            setQuery("");
          } else if (selectedCommand.subCommands) {
            props.setOpenedCommand(selectedCommand);
            setQuery("");
          }
        }
      } else if (props.mode === "search") {
        goToContentPiece(
          searchResults()[selectedIndex()].contentPieceId,
          searchResults()[selectedIndex()].breadcrumb
        );
      }
    }
  });

  createEffect(
    on(
      query,
      (query) => {
        if (query === ">") {
          props.setMode("command");
          setQuery("");

          return;
        }

        if (props.mode === "search") {
          search.clear();
          search();
        }
      },
      { defer: true }
    )
  );
  createEffect(
    on(
      () => props.mode,
      () => {
        setMouseHoverEnabled(false);
        setSelectedIndex(0);
        setLoading(false);
        setAnswer("");
        setSearchResults([]);
        setQuery("");
      }
    )
  );
  createEffect(() => {
    props.openedCommand;
    props.mode;

    if (inputRef() && props.opened) {
      setTimeout(() => {
        inputRef()?.focus();
      }, 300);
    }
  });
  onCleanup(() => {
    unsubscribeTinykeys();
  });

  const getIcon = (): string => {
    switch (props.mode) {
      case "command":
        return mdiConsoleLine;
      case "search":
        return mdiMagnify;
      case "ask":
        return mdiHeadSnowflakeOutline;
    }
  };
  const getLabel = (): string => {
    switch (props.mode) {
      case "command":
        return "Command";
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
      wrapperClass="mt-3 md:mt-32"
      hiddenClass="opacity-0 pointer-events-none"
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
          <Show when={props.openedCommand}>
            <Button badge size="small" text="soft" color="contrast" hover={false} class="m-0 ml-2">
              {props.openedCommand?.name}
            </Button>
          </Show>
          <Input
            value={query()}
            setValue={(value) => {
              if (props.mode === "search") {
                setLoading(true);
              }

              setQuery(value);
            }}
            ref={setInputRef}
            placeholder={getLabel()}
            wrapperClass="flex-1 m-0"
            id="command-palette-input"
            class="m-0 bg-transparent"
            onEnter={() => {
              if (props.mode === "ask" && hostConfig.aiSearch) {
                setLoading(true);
                setAnswer("");
                ask();
              }
            }}
            onKeyDown={(event) => {
              if (
                props.mode === "command" &&
                event.key === "Backspace" &&
                !query() &&
                hostConfig.search
              ) {
                if (props.openedCommand) {
                  props.setOpenedCommand(null);
                } else {
                  props.setMode("search");
                }
              }
            }}
            adornment={() => (
              <Show when={(props.mode === "search" || props.mode === "ask") && hostConfig.aiSearch}>
                <Tooltip text="Ask" side="left" class="-ml-1">
                  <IconButton
                    path={mdiCreationOutline}
                    class="m-0"
                    text={props.mode === "ask" ? "base" : "soft"}
                    color={props.mode === "ask" ? "primary" : "base"}
                    onClick={() => {
                      props.setMode((mode) => (mode === "ask" ? "search" : "ask"));
                    }}
                    variant="text"
                  />
                </Tooltip>
              </Show>
            )}
          />
        </div>
        <div class="relative overflow-hidden">
          <div
            class="flex-1 flex flex-col overflow-auto  max-h-[calc(100vh-21.5rem)] scrollbar-sm"
            ref={setScrollableContainerRef}
          >
            <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
            <Switch>
              <Match when={props.mode === "search" && hostConfig.search}>
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
                            goToContentPiece(result.contentPieceId, result.breadcrumb);
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
              <Match when={props.mode === "ask" && hostConfig.aiSearch}>
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
              <Match when={props.mode === "command"}>
                <Show when={!filteredCommands().length}>
                  <span class="p-4 text-center text-gray-500 dark:text-gray-400">No results</span>
                </Show>
                <For each={[null, ...categories]}>
                  {(category) => {
                    const commands = (): Command[] => {
                      return filteredCommands().filter((command) => {
                        if (!category) return !command.category;

                        return command.category === category.id;
                      });
                    };

                    return (
                      <>
                        <Show when={commands().length && category}>
                          <span class="px-3 pb-0.5 pt-2 text-gray-500 dark:text-gray-400 text-sm">
                            {category?.label}
                          </span>
                        </Show>
                        <For each={commands()}>
                          {(command) => {
                            return (
                              <div
                                onClick={() => {
                                  if (command.action) {
                                    command.action();
                                    props.setOpened(false);
                                    setQuery("");
                                  } else if (command.subCommands) {
                                    props.setOpenedCommand(command);
                                    setQuery("");
                                  }
                                }}
                                onPointerEnter={() => {
                                  if (!mouseHoverEnabled()) return;

                                  setSelectedIndex(filteredCommands().indexOf(command));
                                }}
                                data-selected={command === selectedCommand()}
                              >
                                <Show
                                  when={command.render}
                                  fallback={
                                    <Card
                                      class={clsx(
                                        "flex justify-start items-center py-2 px-3 m-0 rounded-none border-none",
                                        command === selectedCommand() &&
                                          "bg-gray-300 dark:bg-gray-700 cursor-pointer",
                                        command !== selectedCommand() && "bg-transparent"
                                      )}
                                      color="base"
                                    >
                                      <Show when={command.icon}>
                                        <Icon
                                          path={command.icon || ""}
                                          class="h-5 w-5 mr-2 fill-gray-500 dark:fill-gray-400"
                                        />
                                      </Show>
                                      <span>{command.name}</span>
                                    </Card>
                                  }
                                >
                                  <Dynamic
                                    component={command.render}
                                    selected={command === selectedCommand()}
                                    command={command}
                                  />
                                </Show>
                              </div>
                            );
                          }}
                        </For>
                      </>
                    );
                  }}
                </For>
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
          <Show when={hostConfig.search}>
            <IconButton
              path={mdiConsoleLine}
              label="Command"
              size="small"
              variant="text"
              color={props.mode === "command" ? "primary" : "base"}
              text={props.mode === "command" ? "base" : "soft"}
              onClick={() => {
                props.setMode((mode) => (mode === "command" ? "search" : "command"));
              }}
            />
          </Show>
        </div>
      </Card>
    </Overlay>
  );
};
const CommandPaletteProvider: ParentComponent = (props) => {
  const hostConfig = useHostConfig();
  const [opened, setOpened] = createSignal(false);
  const [commands, setCommands] = createSignal<Command[]>([]);
  const [mode, setMode] = createSignal<CommandPaletteMode>(
    hostConfig.search ? "search" : "command"
  );
  const [openedCommand, setOpenedCommand] = createSignal<Command | null>(null);
  const registerCommand = (command: Command | Command[]): void => {
    if (Array.isArray(command)) {
      setCommands((commands) => [...commands, ...command]);
    } else {
      setCommands((commands) => [...commands, command]);
    }

    onCleanup(() => {
      setCommands((commands) => {
        return commands.filter((filteredCommand) => {
          if (Array.isArray(command)) {
            return !command.includes(filteredCommand);
          }

          return filteredCommand !== command;
        });
      });
    });
  };
  const open = (mode?: CommandPaletteMode, openedCommand?: Command | null): void => {
    setOpened(true);
    setMode(mode || (hostConfig.search ? "search" : "command"));
    setOpenedCommand(openedCommand || null);
  };
  const close = (): void => {
    setOpened(false);
    setMode(hostConfig.search ? "search" : "command");
    setOpenedCommand(null);
  };

  createEffect(
    on(commands, () => {
      if (openedCommand() && !commands().includes(openedCommand()!)) {
        setOpenedCommand(null);
      }
    })
  );

  return (
    <CommandPaletteContext.Provider
      value={{
        opened,
        open,
        close,
        registerCommand
      }}
    >
      {props.children}
      <CommandPalette
        opened={opened()}
        mode={mode()}
        openedCommand={openedCommand()}
        setOpened={setOpened}
        setMode={setMode}
        setOpenedCommand={setOpenedCommand}
        commands={commands()}
      />
    </CommandPaletteContext.Provider>
  );
};
const useCommandPalette = (): CommandPaletteContextData => {
  return useContext(CommandPaletteContext)!;
};

export { CommandPaletteProvider, useCommandPalette };
export type { Command, CommandPaletteMode };
