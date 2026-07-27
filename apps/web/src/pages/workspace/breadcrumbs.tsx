import { useParams } from "@solidjs/router";
import { Component, createMemo, For, Show } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { useRouteData } from "#web/lib/routes";
import { Button, IconButton } from "@andesine/components";

const Breadcrumbs: Component = () => {
  const params = useParams<{ slug?: string; workspaceID?: string }>();
  const { content } = useWorkspace();
  const routeData = useRouteData();
  const items = createMemo(() => {
    const data = routeData();

    if (data) {
      return data.breadcrumbs;
    }

    if (!params.slug) return [];

    const entry = content.entriesCollection().findOne({ id: params.slug });

    return [{ label: entry?.name || params.slug }];
  });

  return (
    <div class="flex h-11 w-full items-center justify-center gap-2 p-2">
      <Show when={items().length > 0}>
        <span class="inline-flex items-center justify-center text-base font-medium leading-[1]">
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
                  class="text-sm p-0.5 m-0.5"
                >
                  {item.label}
                </Button>
              </>
            )}
          </For>
        </span>
      </Show>
      <div class="flex-1" />
    </div>
  );
};

export { Breadcrumbs };
