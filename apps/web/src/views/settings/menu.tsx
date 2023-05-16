import clsx from "clsx";
import { Component, For } from "solid-js";
import { Button, Icon } from "#components/primitives";
import { config } from "#config";

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
    <>
      <div class="grid grid-cols-2 @lg:grid-cols-3 w-full gap-4">
        <For each={props.sectionMenuItems}>
          {(menuItem) => {
            return (
              <Button
                class={clsx(
                  "h-28 w-full flex flex-col justify-center items-center m-0 disabled:opacity-50",
                  menuItem.resize && "@lg:col-span-2"
                )}
                text="soft"
                onClick={() => props.setCurrentSectionId(menuItem.section)}
              >
                <Icon path={menuItem.icon} class="h-8 w-8" />
                {menuItem.label}
              </Button>
            );
          }}
        </For>
      </div>
      <div class="flex-1" />
      <div class="flex justify-end w-full">
        <span class="text-sm font-semibold text-gray-500 dark:text-gray-400">
          Vrite {config.version}
        </span>
      </div>
    </>
  );
};

export { MenuSection };
