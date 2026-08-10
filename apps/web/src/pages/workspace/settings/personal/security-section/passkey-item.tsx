import { TreeItem, useTree } from "#web/components/tree";
import { DropdownArea, DropdownMenu, IconButton } from "@andesine/components";
import { type Component, createEffect, createMemo, createSignal } from "solid-js";
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
          <div class="flex-1 flex items-center gap-1.5">
            <div class="flex items-center flex-1 gap-1.5" title={props.name}>
              <div>{label}</div>
              <div class="w-px h-4 bg-gray-200 rounded-full shrink-0" />
              <span class="text-xs text-gray-400 shrink-0">
                {format(props.createdAt, "MMM d, yyyy")}
              </span>
              <div class="flex-1" />
            </div>
          </div>
        )}
        actions={
          <div onClick={(event: MouseEvent) => event.stopPropagation()}>
            <DropdownMenu
              cardProps={{ class: "w-40" }}
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
