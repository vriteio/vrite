import { TreeItem, useTree } from "#web/components/tree";
import { Card, DropdownArea, DropdownMenu, IconButton } from "@andesine/components";
import { type Component, ComponentProps, createEffect, createMemo, createSignal } from "solid-js";
import clsx from "clsx";
import { format } from "date-fns";

const PasskeyItem: Component<{
  id: string;
  name: string;
  createdAt: Date;
  loading?: boolean;
  onDelete: (ids: string[]) => void;
  onRename: (name: string) => void;
}> = (props) => {
  const [{ selection }, { setRenaming, setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const dropdownOptions = createMemo(() => {
    const selectedIDs = selection();
    const isMulti = selectedIDs.length > 1;

    return [
      ...(!isMulti
        ? [
            [
              {
                label: "Rename",
                icon: "i-lucide:pencil",
                onClick: () => setRenaming(props.id)
              }
            ]
          ]
        : []),
      [
        {
          label: isMulti ? `Delete ${selectedIDs.length} passkeys` : "Delete",
          icon: "i-lucide:trash",
          color: "danger" as const,
          onClick: () => {
            props.onDelete(isMulti ? selectedIDs : [props.id]);
            setSelection([]);
          }
        }
      ]
    ];
  });

  createEffect(() => {
    if (menuOpened()) {
      setSelection((selectedIDs) => (selectedIDs.includes(props.id) ? selectedIDs : [props.id]));
    }
  });

  return (
    <DropdownArea>
      <TreeItem
        id={props.id}
        label={props.name}
        topLevel
        checkbox={!props.loading}
        selectable={!props.loading}
        class={clsx("px-1 py-0.5", props.loading && "animate-pulse")}
        icon={<div class="i-fluent:person-passkey-16-regular h-5.5 w-5.5 text-gray-400" />}
        onRename={props.onRename}
        renderLabel={(label) => (
          <div class="flex min-w-0 flex-1 items-center gap-1.5">
            <div class="flex min-w-0 flex-1 items-center gap-1.5" title={props.name}>
              <div class="min-w-0 truncate">{label}</div>
              <div class="hidden h-4 w-px shrink-0 rounded-full bg-gray-200 md:block" />
              <span class="hidden shrink-0 text-xs text-gray-400 md:inline">
                {format(props.createdAt, "MMM d, yyyy")}
              </span>
              <div class="flex-1" />
            </div>
          </div>
        )}
        actions={
          <div onClick={(event: MouseEvent) => event.stopPropagation()}>
            <DropdownMenu
              title={props.name}
              cardProps={
                { "class": "w-40", "data-tree-interaction": "" } as Partial<
                  ComponentProps<typeof Card>
                >
              }
              opened={menuOpened()}
              portal={false}
              setOpened={setMenuOpened}
              trigger={() => (
                <div
                  class={clsx(
                    !menuOpened() &&
                      !props.loading &&
                      "opacity-20 media-mouse:group-hover:opacity-100"
                  )}
                >
                  <IconButton
                    icon="i-lucide:ellipsis-vertical"
                    size="small"
                    variant="text"
                    text="soft"
                    loading={props.loading}
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

export { PasskeyItem };
