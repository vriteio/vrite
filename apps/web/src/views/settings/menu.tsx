import clsx from "clsx";
import { Component, For } from "solid-js";
import { Button, Card, Icon } from "#components/primitives";

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
              <button onClick={() => props.setCurrentSectionId(menuItem.section)}>
                <Card
                  class={clsx(
                    "h-28 w-full flex flex-col justify-center items-center m-0 disabled:opacity-50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
                    menuItem.resize && "@lg:col-span-2"
                  )}
                >
                  <Icon path={menuItem.icon} class="h-8 w-8" />
                  {menuItem.label}
                </Card>
              </button>
            );
          }}
        </For>
      </div>
    </>
  );
};

export { MenuSection };
