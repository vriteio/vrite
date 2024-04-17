import { ExtensionIcon } from "./extension-icon";
import { ExtensionsMenuView } from "./extensions-menu-view";
import { ExtensionConfigurationView } from "./extension-configuration-view";
import { ExtensionsURLInstallView } from "./extensions-url-install-view";
import { Component, createMemo, createSignal, Match, Show, Switch } from "solid-js";
import { mdiChevronLeft, mdiClose, mdiDotsVertical, mdiLinkVariant } from "@mdi/js";
import clsx from "clsx";
import { Dynamic } from "solid-js/web";
import { Motion, Presence } from "solid-motionone";
import { Button, Card, Dropdown, Heading, Icon, IconButton } from "#components/primitives";
import { ScrollShadow } from "#components/fragments";
import { createRef } from "#lib/utils";
import { ExtensionDetails } from "#context/extensions";
import { useLocalStorage } from "#context";

interface SubSection {
  label: string;
  icon: string;
  goBack(): void;
}

const ExtensionsView: Component = () => {
  const { setStorage } = useLocalStorage();
  const [installFromURL, setInstallFromURL] = createSignal(false);
  const [dropdownOpened, setDropdownOpened] = createSignal(false);
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
      iconDark: openedExtension()?.spec.iconDark
    };
  });

  return (
    <Card
      class="@container m-0 p-0 border-0 rounded-none flex flex-col h-full overflow-auto scrollbar-sm-contrast"
      color="contrast"
    >
      <div
        class={clsx(
          "flex justify-start items-start mb-4 px-5 flex-col py-1",
          openedExtension() || installFromURL() ? "pt-1" : "pt-6"
        )}
      >
        <IconButton
          variant="text"
          class={clsx("m-0 h-6 -mb-1", !openedExtension() && !installFromURL() && "hidden")}
          onClick={() => {
            setInstallFromURL(false);

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
            <div class="flex justify-center items-center w-full">
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
              {installFromURL() ? (
                <>
                  <Icon class="w-8 h-8 p-0.5 mr-1" path={mdiLinkVariant} />
                  <Heading level={2} class="flex-1">
                    Install from URL
                  </Heading>
                </>
              ) : (
                <Heading level={1} class="flex-1">
                  {currentSection().label}
                </Heading>
              )}
              <Dropdown
                placement="bottom-end"
                overlay={false}
                fixed
                activatorButton={() => (
                  <IconButton path={mdiDotsVertical} text="soft" class="m-0" />
                )}
                opened={dropdownOpened()}
                setOpened={setDropdownOpened}
              >
                <IconButton
                  variant="text"
                  text="soft"
                  class="m-0"
                  label="Install from URL"
                  path={mdiLinkVariant}
                  onClick={() => {
                    setDropdownOpened(false);
                    setInstallFromURL(true);
                  }}
                />
              </Dropdown>
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
          class="w-full h-full overflow-x-hidden overflow-y-auto scrollbar-sm-contrast px-5"
          ref={setScrollableContainerRef}
        >
          <div class="flex justify-start flex-col min-h-full h-full items-start w-full gap-5 relative">
            <Presence initial={false}>
              <Show when={openedExtension() || true} keyed>
                <Motion.div
                  initial={{ opacity: 0, x: openedExtension() ? "100%" : "-100%" }}
                  animate={{ opacity: 1, x: "0%" }}
                  exit={{ opacity: 0, x: openedExtension() ? "100%" : "-100%" }}
                  transition={{ duration: 0.35 }}
                  class="flex justify-start flex-col min-h-[calc(100%-env(safe-area-inset-bottom,0px))] items-start w-full gap-5 absolute pb-5"
                >
                  <Switch>
                    <Match when={openedExtension()}>
                      <ExtensionConfigurationView
                        close={() => setOpenedExtension(null)}
                        extension={openedExtension()!}
                        setActionComponent={(component) => setActionComponent(() => component)}
                      />
                    </Match>
                    <Match when={installFromURL()}>
                      <ExtensionsURLInstallView setOpenedExtension={setOpenedExtension} />
                    </Match>
                    <Match when={true}>
                      <ExtensionsMenuView setOpenedExtension={setOpenedExtension} />
                    </Match>
                  </Switch>
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
