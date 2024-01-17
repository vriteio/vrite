import { mdiCheck, mdiDelete, mdiFileDocumentOutline } from "@mdi/js";
import clsx from "clsx";
import { Component, For, Show, createEffect, createResource, createSignal, on } from "solid-js";
import { SolidEditor } from "@vrite/tiptap-solid";
import { Card, Input, IconButton } from "#components/primitives";
import { createRef } from "#lib/utils";
import { App, useClient } from "#context";

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
  const saveLink = (): void => {
    props.editor.chain().unsetCode().setLink({ href: link() }).focus().run();
    props.setMode("format");
  };
  const [searchResults, setSearchResults] = createSignal<App.ContentPiece[]>([]);
  const [gitData] = createResource(() => {
    return client.git.config.query();
  });

  createEffect(() => {
    console.log(gitData());
  });
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
            placeholder="Paste a link..."
            wrapperClass="w-full md:w-auto"
            setValue={(value) => {
              setLink(value);
            }}
            onEnter={saveLink}
            class="py-0 my-0 bg-transparent max-w-50"
            onKeyDown={(event) => {
              if (!searchResults().length) return;

              if (event.key === "ArrowDown") {
                setSelectedIndex((selectedIndex() + 1) % searchResults().length);
                event.preventDefault();
              } else if (event.key === "ArrowUp") {
                setSelectedIndex(
                  (selectedIndex() + searchResults().length - 1) % searchResults().length
                );
                event.preventDefault();
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
        <Card class="flex flex-col w-full m-0 top-[calc(2.5rem+2px)] absolute p-0 rounded-t-0 overflow-hidden border-t-0 p-1">
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
                  label={
                    <div class="flex flex-col flex-1 justify-start items-start pl-1">
                      <span class="flex-1 text-start font-semibold">{result.title}</span>
                      <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        /
                        {gitData()?.records.find((record) => {
                          return record.contentPieceId === result.id;
                        })?.path || result.id}
                      </span>
                    </div>
                  }
                />
              );
            }}
          </For>
        </Card>
      </Show>
    </div>
  );
};

export { LinkMenu };
