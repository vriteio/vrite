import { useParams, useSearchParams } from "@solidjs/router";
import { type Component, createMemo, For, Show, Suspense } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { useRouteData } from "#web/lib/navigation";
import { Button, IconButton, Skeleton, Tooltip } from "@andesine/components";
import { MobileRightSidePanelMenu } from "./mobile-right-side-panel-menu";
import { RightSidePanelToggle } from "./right-side-panel";
import { createVersionDetailsResponse } from "#web/lib/data";
import { PublishingMenu } from "./publishing-menu";
import clsx from "clsx";

const EditorToolbar: Component = () => {
  const params = useParams<{ slug?: string; workspaceID?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { content } = useWorkspace();
  const routeData = useRouteData();
  const versionID = () => (typeof searchParams.version === "string" ? searchParams.version : "");
  const comparing = () => searchParams.compare === "current";
  const inlineComparison = () => searchParams.compareView === "inline";
  const comparisonLayoutLabel = () => (inlineComparison() ? "Show side by side" : "Show inline");
  const versionResponse = createVersionDetailsResponse(versionID);
  const version = () => versionResponse()?.result;
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
  const returnToCurrent = () => {
    setSearchParams({
      version: undefined,
      compare: undefined,
      compareView: undefined
    });
  };

  return (
    <div class="relative z-20 h-11 w-full shrink-0 items-center justify-center gap-1 p-2 flex">
      <Show when={items().length > 0 || isEntryTitleLoading()}>
        <span class="flex-1 inline-flex items-center justify-center text-base font-medium leading-[1] bg-gray-50/2.5 backdrop-blur-sm rounded-lg overflow-hidden mr-4">
          <IconButton
            icon="i-lucide:hexagon"
            text="soft"
            size="small"
            variant="text"
            hover="none"
            badge
          />
          <For each={items()}>
            {(item, index) => {
              const currentEntry = () => {
                return Boolean(versionID() && index() === items().length - 1);
              };

              return (
                <>
                  <span class="h-4 text-gray-200 flex justify-center items-center w-2">/</span>
                  <Button
                    hover={item.path || currentEntry() ? "underline" : "none"}
                    link={
                      item.path && !currentEntry()
                        ? `/${params.workspaceID || ""}${item.path}`
                        : undefined
                    }
                    onClick={currentEntry() ? returnToCurrent : undefined}
                    badge={!item.path}
                    size="small"
                    variant="text"
                    color="base"
                    class={clsx(
                      "text-sm p-0.5 m-0.5 max-w-64 truncate",
                      currentEntry() && "cursor-pointer"
                    )}
                    title={item.label}
                  >
                    {item.label}
                  </Button>
                </>
              );
            }}
          </For>
          <Show when={isEntryTitleLoading()}>
            <span class="h-4 text-gray-200 flex justify-center items-center w-2">/</span>
            <Skeleton class="m-0.5 h-4 w-20 rounded" />
          </Show>
          <Show when={versionID()}>
            <Suspense
              fallback={
                <>
                  <span class="flex h-4 w-2 items-center justify-center text-gray-200">/</span>
                  <Skeleton class="m-0.5 h-4 w-24 rounded" />
                </>
              }
            >
              <Show when={version()?.entryID === params.slug ? version() : undefined}>
                {(currentVersion) => (
                  <>
                    <span class="flex h-4 w-2 items-center justify-center text-gray-200">/</span>
                    <Button
                      badge
                      size="small"
                      variant="text"
                      color="base"
                      hover="none"
                      class="m-0.5 max-w-64 gap-1 p-0.5 text-sm"
                      title={currentVersion().name || currentVersion().entryName}
                    >
                      <span
                        class={clsx(
                          "h-3.5 w-3.5 shrink-0 text-gray-400",
                          comparing() ? "i-lucide:git-compare-arrows" : "i-lucide:eye"
                        )}
                      />
                      <span class="truncate">
                        {currentVersion().name || currentVersion().entryName}
                      </span>
                    </Button>
                  </>
                )}
              </Show>
            </Suspense>
          </Show>
          <div class="flex-1" />
        </span>
      </Show>
      <Show when={comparing()}>
        <Tooltip
          content={comparisonLayoutLabel()}
          placement="bottom"
          wrapperClass="hidden @7xl/editor:flex"
          fixed
        >
          <IconButton
            icon={inlineComparison() ? "i-lucide:columns-2" : "i-lucide:rows-2"}
            size="small"
            text="soft"
            variant="text"
            onClick={() => {
              setSearchParams({ compareView: inlineComparison() ? undefined : "inline" });
            }}
            aria-label={comparisonLayoutLabel()}
          />
        </Tooltip>
      </Show>
      <Show when={versionID()}>
        <Tooltip content="Return to current" placement="bottom" fixed>
          <IconButton
            icon="i-lucide:file-output"
            size="small"
            text="soft"
            variant="text"
            onClick={returnToCurrent}
            aria-label="Return to current"
          />
        </Tooltip>
      </Show>
      <Show when={!versionID() && entry()}>
        {(currentEntry) => (
          <div class="hidden md:block">
            <PublishingMenu entryID={currentEntry().id} />
          </div>
        )}
      </Show>
      <RightSidePanelToggle />
      <MobileRightSidePanelMenu
        entryID={!versionID() ? entry()?.id : undefined}
        entryTitle={items().at(-1)?.label}
      />
    </div>
  );
};

export { EditorToolbar };
