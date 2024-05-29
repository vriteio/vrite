import clsx from "clsx";
import { Component, For } from "solid-js";
import { mdiChevronRight } from "@mdi/js";
import { Card, Heading, Icon, IconButton } from "#components/primitives";

interface MenuItem {
  icon: string;
  label: string;
  section: string;
  resize?: boolean;
}
interface MenuSectionProps {
  sectionMenuItems: MenuItem[];
  setCurrentSectionId(sectionId: string): void;
}

const MenuSection: Component<MenuSectionProps> = (props) => {
  return (
    <div class="flex flex-col items-start w-full gap-2">
      <For each={props.sectionMenuItems}>
        {(menuItem) => {
          return (
            <button
              class="group w-full flex"
              onClick={() => props.setCurrentSectionId(menuItem.section)}
            >
              <Card class="transform-origin-center-left w-full transition-transform duration-200 flex justify-center items-center py-2 pl-2 m-0 relative rounded-2xl -ml-0.5 md:group-hover:bg-gray-200 md:dark:group-hover:bg-gray-700">
                <IconButton
                  badge
                  path={menuItem.icon}
                  class="m-0"
                  variant="text"
                  text="soft"
                  hover={false}
                />
                <Heading level={3} class="flex-1 text-start mr-3">
                  {menuItem.label}
                </Heading>
                <IconButton
                  badge
                  path={mdiChevronRight}
                  text="soft"
                  class="m-0 h-7 w-7 p-0.5"
                  variant="text"
                />
              </Card>
            </button>
          );
        }}
      </For>
      <div class="min-h-32" />
    </div>
  );
};

export { MenuSection };
