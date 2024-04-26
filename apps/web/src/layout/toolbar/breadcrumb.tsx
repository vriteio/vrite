import { mdiHexagonSlice6 } from "@mdi/js";
import { Component, Show, For, createMemo, createResource } from "solid-js";
import { Button, Icon } from "#components/primitives";
import { App, useClient, useContentData } from "#context";

const Breadcrumb: Component = () => {
  const client = useClient();
  const { activeContentGroupId, contentGroups, setActiveContentGroupId } = useContentData();
  const activeContentGroup = (): App.ContentGroup<string> | null => {
    return activeContentGroupId() ? contentGroups[activeContentGroupId()!]! : null;
  };
  const [ancestors] = createResource(
    activeContentGroup,
    async (ancestor) => {
      try {
        const ancestors = await client.contentGroups.listAncestors.query({
          contentGroupId: ancestor.id || ""
        });

        return [...ancestors, ancestor];
      } catch (e) {
        return [];
      }
    },
    { initialValue: [] }
  );
  const renderedAncestors = createMemo(() => {
    return ancestors().slice(-3);
  });

  return (
    <div class="hidden md:flex bg-gray-200 dark:bg-gray-900 rounded-lg overflow-auto scrollbar-hidden">
      <Show when={ancestors().length}>
        <Button
          variant="text"
          text="soft"
          color="base"
          class="m-0 p-1 locked"
          onClick={() => {
            if (ancestors().length > 3) {
              setActiveContentGroupId(ancestors()[ancestors().length - 4].id);
            } else {
              setActiveContentGroupId(null);
            }
          }}
        >
          {ancestors().length > 3 ? (
            <div class="h-6 w-6 flex justify-center items-end pb-1.5 gap-1">
              <div class="rounded-full h-1 w-1 bg-current" />
              <div class="rounded-full h-1 w-1 bg-current" />
            </div>
          ) : (
            <Icon class="h-6 w-6" path={mdiHexagonSlice6} />
          )}
        </Button>
        <For each={renderedAncestors()}>
          {(ancestor, index) => (
            <>
              <div class="py-1 text-gray-500 dark:text-gray-400 -mx-1">
                <div class="w-4 h-6 text-xl flex items-center justify-center">/</div>
              </div>
              <Button
                class="m-0 whitespace-nowrap"
                variant="text"
                text="soft"
                color="base"
                onClick={() => setActiveContentGroupId!(ancestor.id)}
              >
                <span>{ancestor.name}</span>
              </Button>
            </>
          )}
        </For>
      </Show>
    </div>
  );
};

export { Breadcrumb };
