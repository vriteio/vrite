import { SnippetsMenuDataProvider } from "./snippets-context";
import { NewSnippetButton } from "./new-snippet-button";
import { SnippetEntry } from "./snippet-entry";
import { Component, For } from "solid-js";
import { mdiClose } from "@mdi/js";
import { useNavigate } from "@solidjs/router";
import { Heading, IconButton } from "#components/primitives";
import { useLocalStorage } from "#context";
import { useSnippetsData } from "#context/snippets";

const SnippetsList: Component = () => {
  const { setStorage } = useLocalStorage();
  const { snippets } = useSnippetsData();
  const navigate = useNavigate();

  return (
    <div class="relative overflow-hidden w-full pl-3 flex flex-col">
      <div class={"flex justify-start items-start mb-1 px-2 pr-5 flex-col"}>
        <div class="flex justify-center items-center w-full">
          <IconButton
            path={mdiClose}
            text="soft"
            badge
            class="flex md:hidden mr-2 m-0"
            onClick={() => {
              setStorage((storage) => ({
                ...storage,
                rightPanelWidth: 0
              }));
            }}
          />
          <Heading level={1} class="py-1 flex-1">
            Snippets
          </Heading>
        </div>
      </div>
      <div class="relative overflow-hidden flex-1 flex flex-col">
        <NewSnippetButton />
        <For each={snippets()}>
          {(snippet) => {
            return (
              <SnippetEntry
                snippet={snippet}
                onClick={() => {
                  navigate(`/snippet/${snippet.id}`);
                }}
              />
            );
          }}
        </For>
      </div>
    </div>
  );
};
const SnippetsView: Component = () => {
  return (
    <div class="relative flex-1 overflow-hidden flex flex-row h-full">
      <SnippetsMenuDataProvider>
        <SnippetsList />
      </SnippetsMenuDataProvider>
    </div>
  );
};

export { SnippetsView };
