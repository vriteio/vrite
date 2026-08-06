import { useParams } from "@solidjs/router";
import { type Component, createMemo, For, Show } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { useRouteData } from "#web/lib/navigation";
import { Button, IconButton, Skeleton } from "@andesine/components";

const Breadcrumbs: Component = () => {
  const params = useParams<{ slug?: string; workspaceID?: string }>();
  const { content } = useWorkspace();
  const routeData = useRouteData();
  const entry = createMemo(() => {
    if (!params.slug || routeData()) return null;

    return content.entriesCollection().findOne({ id: params.slug });
  });
  const isEntryTitleLoading = () => {
    return Boolean(params.slug && !routeData() && !entry() && content.loading());
  };
  const items = createMemo(() => {
    const data = routeData();

    if (data) {
      return data.breadcrumbs;
    }

    if (!params.slug) return [];

    const currentEntry = entry();

    if (currentEntry) return [{ label: currentEntry.name }];
    if (content.loading()) return [];

    return [{ label: "Entry not found" }];
  });

  return (
    <div class="flex h-11 w-full items-center justify-center gap-2 p-2 absolute top-0 left-0 z-20">
      <Show when={items().length > 0 || isEntryTitleLoading()}>
        <span class="inline-flex items-center justify-center text-base font-medium leading-[1] bg-gray-50/2.5 backdrop-blur-sm rounded-lg">
          <IconButton
            icon="i-lucide:hexagon"
            text="soft"
            size="small"
            variant="text"
            hover="none"
            badge
          />
          <For each={items()}>
            {(item) => (
              <>
                <span class="h-4 text-gray-200 flex justify-center items-center w-2">/</span>
                <Button
                  hover={item.path ? "underline" : "none"}
                  link={item.path ? `/${params.workspaceID || ""}${item.path}` : undefined}
                  badge={!item.path}
                  size="small"
                  variant="text"
                  color="base"
                  class="text-sm p-0.5 m-0.5 max-w-64 truncate"
                  title={item.label}
                >
                  {item.label}
                </Button>
              </>
            )}
          </For>
          <Show when={isEntryTitleLoading()}>
            <span class="h-4 text-gray-200 flex justify-center items-center w-2">/</span>
            <Skeleton class="m-0.5 h-4 w-20 rounded" />
          </Show>
        </span>
      </Show>
      <div class="flex-1" />
    </div>
  );
};

export { Breadcrumbs };
