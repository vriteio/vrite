import { IconButton, Tooltip } from "@andesine/components";
import { useParams } from "@solidjs/router";
import { type Component, createMemo, createSignal, For, Show, Suspense } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useLayout } from "#web/context/layout";
import { useWorkspace } from "#web/context/workspace";
import { VersionHistoryPanel } from "./version-history-panel";
import { VersionHistorySkeleton } from "./version-history-skeleton";

interface RightSidePanelOption {
  id: string;
  label: string;
  icon: string;
  component: Component<{ opened?: boolean }>;
  fallback: Component;
  available(): boolean;
}
const DEFAULT_RIGHT_SIDE_PANEL_WIDTH = 248;

const VersionHistoryPanelFallback: Component = () => {
  return (
    <div class="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-1">
      <div class="flex h-9 shrink-0 items-center">
        <h2 class="text-2xl font-semibold">Versions</h2>
      </div>
      <VersionHistorySkeleton />
    </div>
  );
};

const useRightSidePanelOptions = () => {
  const params = useParams<{ slug?: string }>();
  const { content, currentWorkspace } = useWorkspace();
  const options: RightSidePanelOption[] = [
    {
      id: "versions",
      label: "Versions",
      icon: "i-lucide:history",
      component: VersionHistoryPanel,
      fallback: VersionHistoryPanelFallback,
      available: () => {
        const entry = content.entries.get({ entryID: params.slug || "" });

        return Boolean(
          entry &&
          currentWorkspace() &&
          content.canEntry(entry.collectionID || null, "version:read")
        );
      }
    }
  ];

  return createMemo(() => options.filter((option) => option.available()));
};

const RightSidePanel: Component = () => {
  const { layout } = useLayout();
  const options = useRightSidePanelOptions();
  const [selectedOptionID, setSelectedOptionID] = createSignal<string>();
  const selectedOption = createMemo(() => {
    return options().find((option) => option.id === selectedOptionID()) || options()[0];
  });

  return (
    <div class="flex min-h-0 w-full flex-1 flex-col">
      <div class="flex w-full gap-1 px-1">
        <For each={options()}>
          {(option) => {
            const selected = () => selectedOption()?.id === option.id;

            return (
              <Tooltip content={option.label} placement="bottom" fixed>
                <div class="relative flex items-center justify-center">
                  <Show when={selected()}>
                    <div class="absolute left-0 top-0 h-full w-full rounded-lg bg-gradient-to-tr opacity-10" />
                  </Show>
                  <IconButton
                    variant={selected() ? "solid" : "text"}
                    text={selected() ? "primary" : "soft"}
                    color={selected() ? "primary" : "base"}
                    iconProps={{ class: "h-5 w-5" }}
                    icon={option.icon}
                    onClick={() => setSelectedOptionID(option.id)}
                    aria-label={option.label}
                    aria-pressed={selected()}
                  />
                </div>
              </Tooltip>
            );
          }}
        </For>
      </div>
      <div class="relative flex min-h-0 w-full flex-1">
        <Show when={layout.rightSidePanelWidth > 0 && selectedOption()} keyed>
          {(option) => (
            <Suspense fallback={<Dynamic component={option.fallback} />}>
              <Dynamic component={option.component} />
            </Suspense>
          )}
        </Show>
      </div>
    </div>
  );
};

const RightSidePanelToggle: Component = () => {
  const { layout, setLayout } = useLayout();
  const options = useRightSidePanelOptions();
  const opened = () => layout.rightSidePanelWidth > 0;

  return (
    <Show when={options().length > 0}>
      <Tooltip
        content={opened() ? "Close side panel" : "Open side panel"}
        placement="bottom"
        wrapperClass="hidden md:flex"
        fixed
      >
        <IconButton
          icon={opened() ? "i-lucide:panel-right-close" : "i-lucide:panel-right-open"}
          size="small"
          text="soft"
          variant="text"
          onClick={() => {
            setLayout("rightSidePanelWidth", opened() ? 0 : DEFAULT_RIGHT_SIDE_PANEL_WIDTH);
          }}
          aria-label={opened() ? "Close side panel" : "Open side panel"}
          aria-expanded={opened()}
        />
      </Tooltip>
    </Show>
  );
};

export {
  DEFAULT_RIGHT_SIDE_PANEL_WIDTH,
  RightSidePanel,
  RightSidePanelToggle,
  useRightSidePanelOptions
};
