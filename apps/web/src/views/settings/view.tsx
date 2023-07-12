import { WorkspaceSection } from "./workspace";
import { AppearanceSection } from "./appearance";
import { MenuSection } from "./menu";
import { WebhooksSection } from "./webhooks";
import { APISection } from "./api";
import { ProfileSection } from "./profile";
import { EditorSection } from "./editor";
import { SecuritySection } from "./security";
import { MetadataSection } from "./metadata";
import clsx from "clsx";
import { Dynamic } from "solid-js/web";
import {
  mdiAccount,
  mdiChevronLeft,
  mdiClose,
  mdiDatabase,
  mdiHexagonSlice6,
  mdiPalette,
  mdiPencil,
  mdiShieldLock,
  mdiTransitConnectionVariant,
  mdiWebhook
} from "@mdi/js";
import { Component, createMemo, createSignal, Setter, Show } from "solid-js";
import { Motion, Presence } from "@motionone/solid";
import { createRef } from "#lib/utils";
import { ScrollShadow } from "#components/fragments";
import { Card, Heading, IconButton } from "#components/primitives";
import { useUIContext } from "#context";

interface SubSection {
  label: string;
  icon: string;
  goBack(): void;
}

type SettingsSectionComponent = Component<{
  setSubSection: Setter<SubSection | null>;
  setSection(section: string): void;
  setActionComponent(component: Component<{}> | null): void;
}>;

const SettingsView: Component = () => {
  const { storage, setStorage } = useUIContext();
  const [currentSectionId, setCurrentSectionId] = createSignal("menu");
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [subSection, setSubSection] = createSignal<SubSection | null>(null);
  const [actionComponent, setActionComponent] = createSignal<Component<{}> | null>(null);
  const sectionMenuItems = [
    {
      label: "API",
      icon: mdiTransitConnectionVariant,
      resize: true,
      section: "api"
    },
    { label: "Webhooks", icon: mdiWebhook, section: "webhooks" },
    { label: "Profile", icon: mdiAccount, section: "profile" },
    { label: "Appearance", icon: mdiPalette, section: "appearance" },
    { label: "Security", icon: mdiShieldLock, section: "security" },
    {
      label: "Workspace",
      icon: mdiHexagonSlice6,
      section: "workspace"
    },
    {
      label: "Editing experience",
      icon: mdiPencil,
      resize: true,
      section: "editor"
    },
    { label: "Metadata", resize: true, icon: mdiDatabase, section: "metadata" }
  ];
  const sections: Record<string, SettingsSectionComponent> = {
    menu() {
      return (
        <MenuSection
          setCurrentSectionId={setCurrentSectionId}
          sectionMenuItems={sectionMenuItems}
        />
      );
    },
    workspace: WorkspaceSection,
    appearance: AppearanceSection,
    webhooks: WebhooksSection,
    api: APISection,
    profile: ProfileSection,
    editor: EditorSection,
    security: SecuritySection,
    metadata: MetadataSection
  };
  const currentSection = createMemo(() => {
    const sectionMenuItem = sectionMenuItems.find((menuItem) => {
      return menuItem.section === currentSectionId();
    });

    if (sectionMenuItem) {
      return {
        label: sectionMenuItem.label,
        id: sectionMenuItem.section,
        icon: sectionMenuItem.icon
      };
    }

    return { label: "Settings", id: "menu" };
  });

  return (
    <Card
      class="@container m-0 p-0 border-0 rounded-none pb-0 flex flex-col h-full overflow-auto scrollbar-sm-contrast"
      color="contrast"
    >
      <div
        class={clsx(
          "flex justify-start items-start mb-4 px-5 flex-col",
          currentSectionId() === "menu" ? "pt-5" : "pt-2"
        )}
      >
        <IconButton
          variant="text"
          class={clsx("m-0 h-6 -mb-1", currentSectionId() === "menu" && "hidden")}
          onClick={() => {
            if (subSection()) {
              subSection()?.goBack();
              setSubSection(null);
            } else {
              setActionComponent(null);
              setCurrentSectionId("menu");
            }
          }}
          label={subSection() ? currentSection().label : "Settings"}
          size="small"
          path={mdiChevronLeft}
        ></IconButton>

        <Show
          when={currentSectionId() !== "menu"}
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
          class="w-full h-full overflow-x-hidden overflow-y-auto scrollbar-sm-contrast px-5 pb-5"
          ref={setScrollableContainerRef}
        >
          <div class="flex justify-start flex-col min-h-full h-full items-start w-full gap-5 relative">
            <Presence initial={false}>
              <Show when={currentSectionId()} keyed>
                <Motion.div
                  initial={{ opacity: 0, x: currentSectionId() === "menu" ? "-100%" : "100%" }}
                  animate={{ opacity: 1, x: "0%" }}
                  exit={{ opacity: 0, x: currentSectionId() === "menu" ? "-100%" : "100%" }}
                  transition={{ duration: 0.35 }}
                  class="flex justify-start flex-col min-h-[calc(100%-env(safe-area-inset-bottom,0px))] items-start w-full gap-5 absolute"
                >
                  <Dynamic
                    component={sections[currentSectionId()]}
                    setSubSection={setSubSection}
                    setSection={(section: string) => {
                      setActionComponent(null);
                      setCurrentSectionId(section);
                    }}
                    setActionComponent={(component: Component<{}> | null) => {
                      setActionComponent(() => component);
                    }}
                  />
                </Motion.div>
              </Show>
            </Presence>
          </div>
        </div>
      </div>
    </Card>
  );
};

export { SettingsView };
export type { SettingsSectionComponent, SubSection };

/*

<For each={Object.entries(sections)}>
              {([key, Component]) => {
                return (
                  <Presence exitBeforeEnter>
                    <Show when={key === currentSectionId()}>
                      <Component
                        setSubSection={setSubSection}
                        setSection={(section: string) => {
                          setActionComponent(null);
                          setCurrentSectionId(section);
                        }}
                        setActionComponent={(component: Component<{}> | null) => {
                          setActionComponent(() => component);
                        }}
                      />
                    </Show>
                  </Presence>
                );
              }}
            </For>
*/
