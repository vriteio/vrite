import { WorkspaceSection } from "./workspace";
import { AppearanceSection } from "./appearance";
import { MenuSection } from "./menu";
import { WebhooksSection } from "./webhooks";
import { APISection } from "./api";
import { ProfileSection } from "./profile";
import { EditorSection } from "./editor";
import { SecuritySection } from "./security";
import clsx from "clsx";
import { Dynamic } from "solid-js/web";
import {
  mdiAccount,
  mdiChevronLeft,
  mdiHexagonSlice6,
  mdiPalette,
  mdiPencil,
  mdiShieldLock,
  mdiTransitConnectionVariant,
  mdiWebhook
} from "@mdi/js";
import { Component, createMemo, createSignal, Setter, Show } from "solid-js";
import { createRef } from "#lib/utils";
import { ScrollShadow } from "#components/fragments";
import { Heading, IconButton } from "#components/primitives";

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
    }
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
    security: SecuritySection
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
    <>
      <div class="@container pb-0 flex flex-col h-full overflow-auto scrollbar-sm-contrast">
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
            fallback={<Heading level={1}>{currentSection().label}</Heading>}
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
            <div class="flex justify-start flex-col min-h-full items-start w-full gap-5">
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export { SettingsView };
export type { SettingsSectionComponent, SubSection };
