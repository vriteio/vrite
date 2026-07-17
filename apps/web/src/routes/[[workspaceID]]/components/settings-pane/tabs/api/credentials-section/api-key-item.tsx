import { DropdownArea, DropdownMenu, IconButton } from "@andesine/components";
import { Component, createEffect, createMemo, createSignal, For, Show } from "solid-js";
import clsx from "clsx";
import { TreeItem, useTree } from "#web/components/tree";
import type { KeyPermission } from "../key-form";

interface APIKeyItemProps {
  id: string;
  name: string;
  prefix: string;
  permissions: KeyPermission[];
  createdAt: Date;
  expiresAt: string | null;
  disabled?: boolean;
  getPermissionLabel(permission: KeyPermission): string;
  getExpirationStatus(expiresAt: string | null): string | null;
  onEdit(): void;
  onRotate(): void;
  onDelete(ids: string[]): void;
}

const APIKeyItem: Component<APIKeyItemProps> = (props) => {
  const [{ selection }, { setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const dropdownOptions = createMemo(() => {
    const selectedIDs = selection();
    const isMulti = selectedIDs.length > 1;

    return [
      ...(!isMulti
        ? [
            [
              { label: "Edit", icon: "i-lucide:pencil", onClick: props.onEdit },
              { label: "Rotate", icon: "i-lucide:refresh-cw", onClick: props.onRotate }
            ]
          ]
        : []),
      [
        {
          label: isMulti ? `Delete ${selectedIDs.length} keys` : "Delete",
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
        checkboxesEnabled={!props.disabled}
        class="px-1 py-1"
        icon={<div class="i-lucide:key-round h-5 w-5 text-gray-400 dark:text-gray-500" />}
        actions={
          <div onClick={(event: MouseEvent) => event.stopPropagation()}>
            <DropdownMenu
              cardProps={{ class: "w-48" }}
              opened={menuOpened()}
              portal={false}
              setOpened={setMenuOpened}
              trigger={() => (
                <div class={clsx(!menuOpened() && "opacity-0 group-hover:opacity-100")}>
                  <IconButton
                    icon="i-lucide:ellipsis-vertical"
                    size="small"
                    variant="text"
                    text="soft"
                    disabled={props.disabled}
                  />
                </div>
              )}
              items={dropdownOptions()}
            />
          </div>
        }
      >
        <div class="flex flex-1 items-center gap-1.5 overflow-hidden">
          <div class="flex min-w-0 flex-1 flex-col gap-1">
            <div class="flex min-w-0 items-center gap-2">
              <span class="truncate font-semibold">{props.name}</span>
              <code class="shrink-0 font-mono text-xs text-gray-400 dark:text-gray-500">
                {props.prefix}...
              </code>
            </div>
            <div class="flex flex-wrap gap-1">
              <For each={props.permissions}>
                {(permission) => (
                  <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {props.getPermissionLabel(permission)}
                  </span>
                )}
              </For>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2 self-start pl-2">
            <Show when={props.getExpirationStatus(props.expiresAt)}>
              {(status) => <span class="text-xs font-medium text-amber-500">{status()}</span>}
            </Show>
            <span class="text-xs text-gray-400 dark:text-gray-500">
              {props.createdAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </span>
          </div>
        </div>
      </TreeItem>
    </DropdownArea>
  );
};

export { APIKeyItem };
