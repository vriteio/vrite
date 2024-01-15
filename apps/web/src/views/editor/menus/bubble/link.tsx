import { mdiCheck, mdiDelete, mdiFileDocumentOutline } from "@mdi/js";
import clsx from "clsx";
import { Component, For, Show, createEffect, createSignal, on } from "solid-js";
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
  const [linkInputRef, setLinkInputRef] = createRef<HTMLInputElement | null>(null);
  const saveLink = (): void => {
    props.editor.chain().unsetCode().setLink({ href: link() }).focus().run();
    props.setMode("format");
  };
  const [searchResults, setSearchResults] = createSignal<App.ContentPiece[]>([]);

  createEffect(
    on<string, AbortController>(link, (link, _, previousController) => {
      previousController?.abort();

      const controller = new AbortController();

      if (link) {
        client.search.search
          .query({ query: link, byTitle: true }, { signal: controller.signal })
          .then((results) => {
            setSearchResults(results.map((result) => result.contentPiece));
            console.log(results);
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

  return (
    <div class="relative">
      <Card
        class={clsx(
          "relative flex m-0 p-0 overflow-x-auto scrollbar-hidden md:overflow-initial not-prose",
          props.class
        )}
      >
        <Input
          ref={setLinkInputRef}
          value={link()}
          placeholder="Paste a link..."
          wrapperClass="w-full md:w-auto"
          setValue={(value) => {
            setLink(value);
          }}
          onEnter={saveLink}
          class="py-0 my-0 bg-transparent"
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
      </Card>
      <Show when={searchResults().length}>
        <Card class="flex flex-col absolute top-14 w-full m-0">
          <For each={searchResults()}>
            {(result) => {
              return (
                <IconButton
                  path={mdiFileDocumentOutline}
                  label={<span class="flex-1 text-start pl-1">{result.title}</span>}
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
