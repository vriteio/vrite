import { type Card, DropdownArea, DropdownMenu, IconButton } from "@andesine/components";
import clsx from "clsx";
import {
  type Component,
  type ComponentProps,
  createEffect,
  createMemo,
  createSignal
} from "solid-js";
import { TreeItem, useTree } from "#web/components/tree";
import type { GroupDetails } from "#web/lib/data";

interface GroupItemProps {
  canManage: boolean;
  group: GroupDetails;
  onDelete(ids: string[]): void;
  onEdit(): void;
}

const GroupItem: Component<GroupItemProps> = (props) => {
  const [{ selection }, { setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const assignedCount = () => props.group.memberIDs.length + props.group.invitationIDs.length;
  const dropdownOptions = createMemo(() => {
    const selectedIDs = selection();
    const isMulti = selectedIDs.length > 1;
    const targetIDs = isMulti ? selectedIDs : [props.group.id];

    return [
      ...(!isMulti ? [[{ label: "Edit", icon: "i-lucide:pencil", onClick: props.onEdit }]] : []),
      [
        {
          label: targetIDs.length > 1 ? `Delete ${targetIDs.length} groups` : "Delete",
          icon: "i-lucide:trash",
          color: "danger" as const,
          onClick: () => {
            props.onDelete(targetIDs);
            setSelection([]);
          }
        }
      ]
    ];
  });

  createEffect(() => {
    if (menuOpened()) {
      setSelection((selectedIDs) => {
        return selectedIDs.includes(props.group.id) ? selectedIDs : [props.group.id];
      });
    }
  });

  return (
    <DropdownArea>
      <TreeItem
        id={props.group.id}
        label={props.group.name}
        topLevel
        checkbox={props.canManage}
        selectable={props.canManage}
        class="min-h-8 px-1 py-0.5"
        icon={<div class="i-lucide:users h-5.5 w-5.5 text-gray-400" />}
        onClick={() => props.canManage && props.onEdit()}
        renderLabel={(label) => (
          <div class="flex min-w-0 flex-1 items-center gap-1.5">
            <div class="min-w-0 flex-1 truncate" title={props.group.name}>
              {label}
            </div>
            <span class="shrink-0 text-xs text-gray-400">
              {assignedCount()} {assignedCount() === 1 ? "person" : "people"}
            </span>
          </div>
        )}
        actions={
          <div onClick={(event: MouseEvent) => event.stopPropagation()}>
            <DropdownMenu
              title={props.group.name}
              cardProps={
                { "class": "w-48", "data-tree-interaction": "" } as Partial<
                  ComponentProps<typeof Card>
                >
              }
              opened={menuOpened()}
              portal={false}
              setOpened={setMenuOpened}
              trigger={() => (
                <div
                  class={clsx(!menuOpened() && "opacity-20 media-mouse:group-hover:opacity-100")}
                >
                  <IconButton
                    icon="i-lucide:ellipsis-vertical"
                    size="small"
                    variant="text"
                    text="soft"
                  />
                </div>
              )}
              items={dropdownOptions()}
            />
          </div>
        }
      />
    </DropdownArea>
  );
};

export { GroupItem };
