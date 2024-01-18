import { mdiCheck, mdiDelete, mdiFileDocumentOutline } from "@mdi/js";
import clsx from "clsx";
import { Component, For, Show, createEffect, createResource, createSignal, on } from "solid-js";
import { SolidEditor } from "@vrite/tiptap-solid";
import { scrollTo } from "seamless-scroll-polyfill";
import { Card, Input, IconButton } from "#components/primitives";
import { createRef } from "#lib/utils";
import { App, useClient } from "#context";
import { ScrollShadow } from "#components/fragments";

const LinkMenu: Component<{
  class?: string;
  mode: string;
  opened: boolean;
  editor: SolidEditor;
  setMode(mode: string): void;
}> = (props) => {
  const client = useClient();
  const [link, setLink] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [linkInputRef, setLinkInputRef] = createRef<HTMLInputElement | null>(null);
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLDivElement | null>(
    null
  );
  const saveLink = (): void => {
    props.editor.chain().unsetCode().setLink({ href: link() }).focus().run();
    props.setMode("format");
  };
  const [searchResults, setSearchResults] = createSignal<App.ContentPiece[]>([]);
  const [gitData] = createResource(() => {
    return client.git.config.query();
  });
  const getLink = (contentPiece: App.ContentPiece): string => {
    return `/${
      gitData()?.records.find((record) => {
        return record.contentPieceId === contentPiece.id;
      })?.path || contentPiece.id
    }`;
  };
  const scrollView = (): void => {
    const scrollableContainer = scrollableContainerRef();

    if (!scrollableContainer) return;

    const elementToScrollTo = scrollableContainer.querySelector(
      `[data-index="${Math.max(selectedIndex() - 1, 0)}"]`
    ) as HTMLElement;

    if (elementToScrollTo) {
      scrollTo(
        scrollableContainer,
        { top: elementToScrollTo.offsetTop - 8, behavior: "smooth" },
        { duration: 300 }
      );
    }
  };

  createEffect(
    on<string, AbortController>(link, (link, _, previousController) => {
      previousController?.abort();

      const controller = new AbortController();

      if (link) {
        client.search.search
          .query({ query: link, byTitle: true }, { signal: controller.signal })
          .then((results) => {
            setSearchResults(results.map((result) => result.contentPiece));
          });
      } else {
        setSearchResults([]);
      }

      return controller;
    })
  );
  createEffect(
    on(
      () => props.opened,
      (opened) => {
        if (!opened) {
          setLink("");
        }
      }
    )
  );
  createEffect(
    on(
      () => props.mode,
      (mode) => {
        if (mode === "link") {
          setLink(props.editor.getAttributes("link").href || "");
          setTimeout(() => {
            const linkInput = linkInputRef();

            linkInput?.focus();
          }, 300);
        } else {
          setLink("");
        }
      }
    )
  );
  createEffect(
    on(searchResults, () => {
      setSelectedIndex(0);
    })
  );

  return (
    <div class="relative">
      <Card
        class={clsx(
          "relative flex flex-col m-0 p-0 overflow-x-auto scrollbar-hidden md:overflow-initial not-prose",
          searchResults().length && "rounded-b-0",
          props.class
        )}
      >
        <div class="flex">
          <Input
            ref={setLinkInputRef}
            value={link()}
            placeholder="Provide a link or search"
            wrapperClass="w-full md:w-auto"
            setValue={(value) => {
              setLink(value);
            }}
            onEnter={saveLink}
            class="py-0 my-0 bg-transparent max-w-60"
            onKeyDown={(event) => {
              if (!searchResults().length) return;

              if (event.key === "ArrowDown") {
                setSelectedIndex((selectedIndex() + 1) % searchResults().length);
                scrollView();
                event.preventDefault();
              } else if (event.key === "ArrowUp") {
                setSelectedIndex(
                  (selectedIndex() + searchResults().length - 1) % searchResults().length
                );
                scrollView();
                event.preventDefault();
              } else if (event.key === "Enter") {
                const selectedResult = searchResults()[selectedIndex()];

                props.editor
                  .chain()
                  .unsetLink()
                  .setLink({ href: getLink(selectedResult) })
                  .focus()
                  .run();
                props.setMode("format");
              }
            }}
          />
          <IconButton path={mdiCheck} text="soft" variant="text" onClick={saveLink} />
          <IconButton
            path={mdiDelete}
            text="soft"
            variant="text"
            onClick={() => {
              props.editor.chain().unsetLink().focus().run();
              props.setMode("format");
            }}
          />
        </div>
      </Card>
      <Show when={searchResults().length}>
        <Card class="flex flex-col w-full m-0 top-[calc(2.5rem+2px)] absolute rounded-t-0 border-t-0 p-1 overflow-hidden">
          <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
          <div
            class="flex flex-col max-h-56 overflow-auto scrollbar-sm"
            ref={setScrollableContainerRef}
          >
            <For each={searchResults()}>
              {(result, index) => {
                return (
                  <IconButton
                    path={mdiFileDocumentOutline}
                    hover={false}
                    class={clsx(
                      "items-start",
                      selectedIndex() === index() ? "bg-gray-300" : "bg-transparent"
                    )}
                    onPointerEnter={() => {
                      setSelectedIndex(index());
                    }}
                    data-index={index()}
                    label={
                      <div class="flex flex-col flex-1 justify-start items-start pl-1 text-left">
                        <span class="flex-1 text-start font-semibold clamp-1">{result.title}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 font-mono clamp-1">
                          {getLink(result)}
                        </span>
                      </div>
                    }
                  />
                );
              }}
            </For>
          </div>
        </Card>
      </Show>
    </div>
  );
};

export { LinkMenu };
