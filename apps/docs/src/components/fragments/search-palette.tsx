import { Component, For, Show, createSignal, onMount } from "solid-js";
import {
  mdiAppleKeyboardCommand,
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
import { convert as convertToSlug } from "url-slug";
import { createClient } from "@vrite/sdk/api";
import { Search } from "@vrite/solid-ui";
import { Button, Card, Icon, IconButton, Input, Loader, Tooltip } from "#components/primitives";

const SearchPalette: Component = (props) => {
  const [showShortcut, setShowShortcut] = createSignal(false);
  const client = createClient({
    token: import.meta.env.PUBLIC_VRITE_SEARCH_TOKEN
  });
  const isAppleDevice = (): boolean => {
    const platform = typeof navigator === "object" ? navigator.platform : "";
    const appleDeviceRegex = /Mac|iPod|iPhone|iPad/;

    return appleDeviceRegex.test(platform);
  };

  onMount(() => {
    setShowShortcut(true);
  });

  return (
    <Search.Root
      client={client}
      onResultClick={(result) => {
        const { slug } = result.contentPiece;
        const [_title, subHeading1, subHeading2] = result.breadcrumb;

        window.location.href = `/${slug.startsWith("/") ? slug.slice(1) : slug}#${convertToSlug(
          subHeading2 || subHeading1
        )}`;
      }}
    >
      <Search.Trigger
        as={(props) => {
          return (
            <IconButton
              path={mdiMagnify}
              label={
                <Show when={showShortcut()}>
                  <div class="flex w-full items-center">
                    <span class="pl-1 flex-1 text-start pr-3">Search</span>
                    <kbd class="hidden border-0 bg-gray-300 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-800 md:flex justify-center items-center rounded-md px-1 h-5 text-sm">
                      <Show when={isAppleDevice()} fallback={<span>Ctrl </span>}>
                        <Icon path={mdiAppleKeyboardCommand} class="h-3 w-3" />
                      </Show>
                      K
                    </kbd>
                  </div>
                </Show>
              }
              text="soft"
              class="w-full justify-start m-0 group max-w-screen-md rounded-xl bg-gray-100 dark:bg-gray-900 p-2"
              onClick={props.onClick}
            />
          );
        }}
      ></Search.Trigger>
      <Search.Overlay class="bg-opacity-50 bg-black h-screen w-screen top-0 left-0 fixed z-10 flex justify-center items-start">
        <div class="mt-3 md:mt-32">
          <Search.Palette
            as={(props) => (
              <Card
                class="w-2xl max-w-[calc(100vw-2rem)] max-h-[calc(100vh-16rem)] flex flex-col p-0 overflow-hidden shadow-xl"
                onClick={props.onClick}
                onPointerMove={props.onPointerMove}
              >
                {props.children}
              </Card>
            )}
          >
            <div class="flex w-full justify-center items-center p-2 border-b-2 dark:border-gray-700">
              <Search.Input
                as={(props) => {
                  const getIcon = (): string => {
                    switch (props.mode) {
                      case "search":
                        return mdiMagnify;
                      case "ask":
                        return mdiHeadSnowflakeOutline;
                    }
                  };
                  const getLabel = (): string => {
                    switch (props.mode) {
                      case "ask":
                        return "Just ask";
                      case "search":
                      default:
                        return "Search";
                    }
                  };

                  return (
                    <>
                      <IconButton
                        path={getIcon()}
                        text="soft"
                        variant="text"
                        badge
                        hover={false}
                        class="m-0"
                      />
                      <Input
                        value={props.value}
                        id="search-palette-input"
                        onInput={props.onInput}
                        ref={props.ref}
                        placeholder={getLabel()}
                        wrapperClass="flex-1 m-0"
                        class="m-0 bg-transparent"
                        onKeyDown={props.onKeyDown}
                        onKeyUp={props.onKeyUp}
                        adornment={() => (
                          <Tooltip text="Ask" side="left" class="-ml-1">
                            <Search.ModeToggle
                              as={(props) => {
                                return (
                                  <IconButton
                                    path={mdiCreationOutline}
                                    class="m-0"
                                    text={props.mode === "ask" ? "base" : "soft"}
                                    color={props.mode === "ask" ? "primary" : "base"}
                                    onClick={props.onClick}
                                    variant="text"
                                  />
                                );
                              }}
                            />
                          </Tooltip>
                        )}
                      />
                    </>
                  );
                }}
              />
            </div>
            <div class="relative overflow-hidden">
              <div class="flex-1 flex flex-col overflow-auto  max-h-[calc(100vh-21.5rem)] scrollbar-sm">
                <Search.Answer>
                  {(props) => {
                    return (
                      <Show
                        when={!props.loading}
                        fallback={
                          <div class="flex justify-center items-center p-4">
                            <Loader />
                          </div>
                        }
                      >
                        <Show
                          when={props.answer}
                          fallback={
                            <span class="p-4 text-center text-gray-500 dark:text-gray-400">
                              What do you want to know?
                            </span>
                          }
                        >
                          <div class={clsx("flex flex-col items-center py-2 px-3")}>
                            <div class="flex flex-col w-full prose prose-output">
                              {props.answer}
                            </div>
                            <IconButton
                              color="contrast"
                              text="soft"
                              size="small"
                              badge
                              class="mt-4"
                              path={mdiInformationOutline}
                              label="The information produced may be inaccurate."
                            />
                          </div>
                        </Show>
                      </Show>
                    );
                  }}
                </Search.Answer>
                <Search.Results>
                  {(props) => {
                    return (
                      <Show
                        when={!props.loading}
                        fallback={
                          <div class="flex justify-center items-center p-4">
                            <Loader />
                          </div>
                        }
                      >
                        <For
                          each={props.results}
                          fallback={
                            <span class="p-4 text-center text-gray-500 dark:text-gray-400">
                              <Show when={props.value} fallback="Type to search">
                                No results
                              </Show>
                            </span>
                          }
                        >
                          {(result) => {
                            return (
                              <Search.Result
                                result={result}
                                as={(props) => {
                                  return (
                                    <Card
                                      class={clsx(
                                        "flex justify-start items-center py-2 px-3 m-0 rounded-none border-none",
                                        props.selected &&
                                          "bg-gray-300 dark:bg-gray-700 cursor-pointer",
                                        !props.selected && "bg-transparent"
                                      )}
                                      color="base"
                                      ref={props.ref}
                                      onClick={props.onClick}
                                      onPointerEnter={props.onPointerEnter}
                                    >
                                      {props.children}
                                    </Card>
                                  );
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
                                    <p class="prose prose-output flex-1 text-sm clamp-2 whitespace-pre-wrap text-gray-500 dark:text-gray-400">
                                      {result.content}
                                    </p>
                                  </div>
                                </div>
                              </Search.Result>
                            );
                          }}
                        </For>
                      </Show>
                    );
                  }}
                </Search.Results>
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
              <Search.ModeToggle
                as={(props) => {
                  return (
                    <Button
                      size="small"
                      variant="text"
                      color={props.mode === "ask" ? "primary" : "base"}
                      text={props.mode === "ask" ? "base" : "soft"}
                      onClick={props.onClick}
                    >
                      {props.children}
                    </Button>
                  );
                }}
              >
                Ask a question
              </Search.ModeToggle>
            </div>
          </Search.Palette>
        </div>
      </Search.Overlay>
    </Search.Root>
  );
};

export { SearchPalette };
