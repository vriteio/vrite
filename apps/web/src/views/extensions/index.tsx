import { Component, createMemo, createSignal, Show } from "solid-js";
import { mdiChevronLeft } from "@mdi/js";
import { ContextObject, ExtensionSpec } from "@vrite/extensions";
import clsx from "clsx";
import { Dynamic } from "solid-js/web";
import { Heading, IconButton } from "#components/primitives";
import { ScrollShadow } from "#components/fragments";
import { createRef } from "#lib/utils";
import { ExtensionIcon } from "./extension-icon";
import { ExtensionsMenuView } from "./extensions-menu-view";
import { ExtensionConfigurationView } from "./extension-configuration-view";

interface SubSection {
  label: string;
  icon: string;
  goBack(): void;
}

const ExtensionsView: Component = () => {
  const [openedExtension, setOpenedExtension] = createSignal<{
    spec: ExtensionSpec;
    configuration?: ContextObject;
    id?: string;
  } | null>(null);
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
    <div class="@container pb-0 flex flex-col h-full overflow-auto scrollbar-sm-contrast">
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
          fallback={<Heading level={1}>{currentSection().label}</Heading>}
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
          <div class="flex justify-start flex-col min-h-full items-start w-full gap-5">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export { ExtensionsView };
