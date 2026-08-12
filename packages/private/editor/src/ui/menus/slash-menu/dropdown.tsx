import { DropdownMenu, type MenuItem } from "@andesine/components";
import type { Component, JSX } from "solid-js";
import type { SlashMenuItem } from "./component";

interface SlashMenuDropdownProps {
  anchorPoint?: { x: number; y: number } | null;
  class?: string;
  items: SlashMenuItem[];
  opened: boolean;
  setOpened(opened: boolean): void;
  style?: JSX.CSSProperties;
  trigger?: Component<{ contextMenu: boolean; opened: boolean }>;
  onSelect(item: SlashMenuItem): void;
}

const SlashMenuDropdown: Component<SlashMenuDropdownProps> = (props) => {
  const groupedItems = (): Array<Array<MenuItem | (() => JSX.Element)>> => {
    const groups = new Map<string, SlashMenuItem[]>();

    props.items.forEach((item) => {
      const group = groups.get(item.group) || [];

      group.push(item);
      groups.set(item.group, group);
    });

    return Array.from(groups, ([group, items]) => [
      () => (
        <div class="px-2 py-0.5 text-xs font-medium text-gray-400" aria-hidden="true">
          {group}
        </div>
      ),
      ...items.map((item): MenuItem => {
        return {
          label: item.label,
          icon: item.icon,
          shortcut: item.shortcut,
          onClick: () => props.onSelect(item)
        };
      })
    ]);
  };

  return (
    <DropdownMenu
      title="Commands"
      anchorPoint={props.anchorPoint}
      cardProps={{ class: "w-64" }}
      class={props.class}
      items={groupedItems()}
      opened={props.opened}
      placement="bottom-start"
      setOpened={props.setOpened}
      style={props.style}
      trigger={props.trigger}
    />
  );
};

export { SlashMenuDropdown };
