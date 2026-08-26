import { Dropdown, IconButton } from "@andesine/components";
import { type Component, createSignal, For, Show, Suspense } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useWorkspace } from "#web/context/workspace";
import { PublishingMenu } from "./publishing-menu";
import { useRightSidePanelOptions } from "./right-side-panel";

interface MobileRightSidePanelMenuProps {
  entryID?: string;
  entryTitle?: string;
}

const MobileRightSidePanelMenu: Component<MobileRightSidePanelMenuProps> = (props) => {
  const { content } = useWorkspace();
  const options = useRightSidePanelOptions();
  const [opened, setOpened] = createSignal(false);
  const publishingAvailable = () => {
    const entryID = props.entryID;

    if (!entryID) return false;

    const status = content.getEntryPublishingStatus(entryID);

    return status !== null && status !== "outside";
  };
  const available = () => publishingAvailable() || options().length > 0;
  const title = () => props.entryTitle || "Current entry";

  return (
    <Show when={available()}>
      <Dropdown
        title={title()}
        opened={opened()}
        setOpened={setOpened}
        mobileSheetDragFromContent={false}
        trigger={() => (
          <IconButton
            icon="i-lucide:ellipsis-vertical"
            size="small"
            text="soft"
            variant="text"
            aria-label="Open document tools"
          />
        )}
        class="md:hidden"
      >
        <Show when={opened()}>
          <div class="flex min-h-0 w-full flex-col overflow-y-auto px-1 pb-1 scrollbar-sm">
            <h2 class="my-0.5 truncate text-2xl font-semibold">{title()}</h2>
            <div class="flex flex-col gap-3">
              <Show when={publishingAvailable() ? props.entryID : undefined} keyed>
                {(entryID) => (
                  <div class="flex min-w-0 flex-col">
                    <span class="ml-1 text-xs leading-normal text-gray-400">Actions</span>
                    <div class="flex flex-col gap-0.5">
                      <PublishingMenu entryID={entryID} triggerVariant="menu" />
                    </div>
                  </div>
                )}
              </Show>
              <Show when={options().length > 0}>
                <div class="flex min-w-0 flex-col">
                  <span class="ml-1 text-xs leading-normal text-gray-400">Activity</span>
                  <div class="flex flex-col gap-0.5">
                    <For each={options()}>
                      {(option) => {
                        const [panelOpened, setPanelOpened] = createSignal(false);

                        return (
                          <Dropdown
                            title={option.label}
                            opened={panelOpened()}
                            setOpened={setPanelOpened}
                            mobileSheetDragFromContent={false}
                            class="w-full"
                            trigger={() => (
                              <button
                                type="button"
                                class="group relative flex min-h-7 w-full flex-1 select-none items-center gap-1 overflow-hidden rounded-lg pl-0.5 text-left font-medium outline-none @hover:bg-gradient-to-r @hover:from-gray-500/10 @hover:to-transparent"
                              >
                                <div class="flex h-6 w-6 items-center justify-center">
                                  <div class={`${option.icon} h-5 w-5 text-gray-400`} />
                                </div>
                                <span class="min-w-0 flex-1 truncate">{option.label}</span>
                              </button>
                            )}
                          >
                            <Show when={panelOpened()}>
                              <div class="flex min-h-[50dvh] w-full min-w-0 flex-1 flex-col overflow-hidden px-1">
                                <Suspense fallback={<Dynamic component={option.fallback} />}>
                                  <Dynamic component={option.component} opened />
                                </Suspense>
                              </div>
                            </Show>
                          </Dropdown>
                        );
                      }}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </Dropdown>
    </Show>
  );
};

export { MobileRightSidePanelMenu };
