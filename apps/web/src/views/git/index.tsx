import { ProviderConfigurationView } from "./provider-configuration-view";
import { InitialSetupView } from "./initial-setup-view";
import { providers } from "./providers";
import { Component, createMemo, createSignal, Show } from "solid-js";
import { mdiChevronLeft, mdiClose } from "@mdi/js";
import clsx from "clsx";
import { Dynamic } from "solid-js/web";
import { Motion, Presence } from "@motionone/solid";
import { Card, Heading, IconButton } from "#components/primitives";
import { ScrollShadow } from "#components/fragments";
import { createRef } from "#lib/utils";
import { useLocalStorage } from "#context";

interface SubSection {
  label: string;
  icon: string;
  goBack(): void;
}

const GitView: Component = () => {
  const { setStorage } = useLocalStorage();
  const [openedProvider, setOpenedProvider] = createSignal("");
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [subSection, setSubSection] = createSignal<SubSection | null>(null);
  const [actionComponent, setActionComponent] = createSignal<Component<{}> | null>(null);
  const currentSection = createMemo(() => {
    const providerName = openedProvider();
    const provider = providers.find(({ name }) => providerName === name);

    if (!provider) return { label: "Source control", name: "menu", icon: "" };

    return provider;
  });

  return (
    <Card
      class="@container m-0 p-0 border-0 rounded-none flex flex-col h-full overflow-auto scrollbar-sm-contrast"
      color="contrast"
    >
      <div
        class={clsx(
          "flex justify-start items-start mb-4 px-5 flex-col",
          openedProvider() ? "pt-2" : "pt-5"
        )}
      >
        <IconButton
          variant="text"
          class={clsx("m-0 h-6 -mb-1", !openedProvider() && "hidden")}
          onClick={() => {
            if (subSection()) {
              subSection()?.goBack();
              setSubSection(null);
            } else {
              setActionComponent(null);
              setOpenedProvider("");
            }
          }}
          label={subSection() ? currentSection().label : "Source control"}
          size="small"
          path={mdiChevronLeft}
        ></IconButton>

        <Show
          when={openedProvider()}
          fallback={
            <div class="flex justify-center items-center">
              <IconButton
                path={mdiClose}
                text="soft"
                badge
                class="flex md:hidden mr-2 m-0"
                onClick={() => {
                  setStorage((storage) => ({
                    ...storage,
                    sidePanelWidth: 0
                  }));
                }}
              />
              <Heading level={1} class="py-1">
                {currentSection().label}
              </Heading>
            </div>
          }
        >
          <div class="flex justify-center items-center w-full">
            <IconButton
              class="m-0 mr-1"
              path={subSection() ? subSection()?.icon : currentSection().icon}
              variant="text"
              hover={false}
              badge
            />
            <Heading level={2} class="flex-1">
              {subSection() ? subSection()?.label : currentSection().label}
            </Heading>
            <Show when={actionComponent()}>
              <Dynamic component={actionComponent()!} />
            </Show>
          </div>
        </Show>
      </div>
      <div class="flex-col h-full relative flex overflow-hidden">
        <ScrollShadow scrollableContainerRef={scrollableContainerRef} color="contrast" />
        <div
          class="w-full h-full overflow-x-hidden overflow-y-auto scrollbar-sm-contrast px-5 mb-5"
          ref={setScrollableContainerRef}
        >
          <div class="flex justify-start flex-col min-h-full h-full items-start w-full gap-5 relative">
            <Presence initial={false}>
              <Show when={openedProvider() || true} keyed>
                <Motion.div
                  initial={{ opacity: 0, x: openedProvider() ? "100%" : "-100%" }}
                  animate={{ opacity: 1, x: "0%" }}
                  exit={{ opacity: 0, x: openedProvider() ? "100%" : "-100%" }}
                  transition={{ duration: 0.35 }}
                  class="flex justify-start flex-col min-h-[calc(100%-env(safe-area-inset-bottom,0px))] items-start w-full gap-5 absolute"
                >
                  <Show
                    when={openedProvider()}
                    fallback={<InitialSetupView setOpenedProvider={setOpenedProvider} />}
                  >
                    <ProviderConfigurationView
                      close={() => setOpenedProvider("")}
                      providerName={openedProvider()!}
                      setActionComponent={(component) => setActionComponent(() => component)}
                    />
                  </Show>
                </Motion.div>
              </Show>
            </Presence>
          </div>
        </div>
      </div>
    </Card>
  );
};

export { GitView };
