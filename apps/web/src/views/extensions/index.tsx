import { Component, createMemo, createSignal, Show } from "solid-js";
import { mdiChevronLeft, mdiClose } from "@mdi/js";
import { ContextObject, ExtensionSpec } from "@vrite/extensions";
import clsx from "clsx";
import { Dynamic } from "solid-js/web";
import { Card, Heading, IconButton } from "#components/primitives";
import { ScrollShadow } from "#components/fragments";
import { createRef } from "#lib/utils";
import { ExtensionIcon } from "./extension-icon";
import { ExtensionsMenuView } from "./extensions-menu-view";
import { ExtensionConfigurationView } from "./extension-configuration-view";
import { ExtensionDetails } from "#context/extensions";
import { Motion, Presence } from "@motionone/solid";
import { useUIContext } from "#context";

interface SubSection {
  label: string;
  icon: string;
  goBack(): void;
}

const ExtensionsView: Component = () => {
  const { setStorage } = useUIContext();
  const [openedExtension, setOpenedExtension] = createSignal<ExtensionDetails | null>(null);
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [subSection, setSubSection] = createSignal<SubSection | null>(null);
  const [actionComponent, setActionComponent] = createSignal<Component<{}> | null>(null);
  const currentSection = createMemo(() => {
    if (!openedExtension()) return { label: "Extensions", id: "menu" };

    return {
      label: openedExtension()?.spec.displayName,
      name: openedExtension()?.spec.name,
      icon: openedExtension()?.spec.icon,
      darkIcon: openedExtension()?.spec.darkIcon
    };
  });

  return (
    <Card
      class="@container m-0 p-0 border-0 rounded-none flex flex-col h-full overflow-auto scrollbar-sm-contrast"
      color="contrast"
    >
      <div
        class={clsx(
          "flex justify-start items-start mb-4 px-5 flex-col",
          openedExtension() ? "pt-2" : "pt-5"
        )}
      >
        <IconButton
          variant="text"
          class={clsx("m-0 h-6 -mb-1", !openedExtension() && "hidden")}
          onClick={() => {
            if (subSection()) {
              subSection()?.goBack();
              setSubSection(null);
            } else {
              setActionComponent(null);
              setOpenedExtension(null);
            }
          }}
          label={subSection() ? currentSection().label : "Extensions"}
          size="small"
          path={mdiChevronLeft}
        ></IconButton>

        <Show
          when={openedExtension()}
          fallback={
            <div class="flex justify-center items-center">
              <IconButton
                path={mdiClose}
                color="contrast"
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
            <div class="flex h-8 w-8 mr-1">
              <ExtensionIcon spec={openedExtension()!.spec} />
            </div>
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
          class="w-full h-full overflow-x-hidden overflow-y-auto scrollbar-sm-contrast px-5 pb-5"
          ref={setScrollableContainerRef}
        >
          <div class="flex justify-start flex-col min-h-full h-full items-start w-full gap-5 relative">
            <Presence>
              <Show when={openedExtension() || true} keyed>
                <Motion.div
                  initial={{ opacity: 0, x: "-100%" }}
                  animate={{ opacity: 1, x: "0%" }}
                  exit={{ opacity: 0, x: "100%" }}
                  transition={{ duration: 0.35 }}
                  class="flex justify-start flex-col min-h-[calc(100%-env(safe-area-inset-bottom,0px))] items-start w-full gap-5 absolute"
                >
                  <Show
                    when={openedExtension()}
                    fallback={<ExtensionsMenuView setOpenedExtension={setOpenedExtension} />}
                  >
                    <ExtensionConfigurationView
                      close={() => setOpenedExtension(null)}
                      extension={openedExtension()!}
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

export { ExtensionsView };
