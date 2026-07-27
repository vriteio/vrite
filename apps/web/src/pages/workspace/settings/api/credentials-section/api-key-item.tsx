import { DropdownArea, DropdownMenu, IconButton, Tooltip } from "@andesine/components";
import { Component, createEffect, createMemo, createSignal, Show } from "solid-js";
import clsx from "clsx";
import { TreeItem, useTree } from "#web/components/tree";
import type { KeyPermission } from "#web/lib/client";
import { format, formatDistanceToNow } from "date-fns";

interface APIKeyItemProps {
  id: string;
  name: string;
  prefix: string;
  permissions: KeyPermission[];
  createdAt: Date | string;
  expiresAt: string | null;
  loading?: boolean;
  onEdit(): void;
  onRotate(expiresIn: "now" | "1h" | "24h" | "7d"): void;
  onDelete(ids: string[]): void;
}

const expirationOptions = [
  { value: "now", label: "Expire now" },
  { value: "1h", label: "In 1 hour" },
  { value: "24h", label: "In 24 hours" },
  { value: "7d", label: "In 7 days" }
] as const;

const APIKeyItem: Component<APIKeyItemProps> = (props) => {
  const [{ selection }, { setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const dropdownOptions = createMemo(() => {
    const selectedIDs = selection();
    const isMulti = selectedIDs.length > 1;

    return [
      ...(!isMulti && !props.expiresAt
        ? [
            [
              { label: "Edit", icon: "i-lucide:pencil", onClick: props.onEdit },
              {
                label: "Rotate",
                icon: "i-lucide:rotate-ccw-key",
                items: expirationOptions.map((option) => ({
                  label: option.label,
                  onClick: () => props.onRotate(option.value)
                }))
              }
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
        checkbox={!props.loading && !props.expiresAt}
        selectable={!props.loading && !props.expiresAt}
        class={clsx("px-1 py-0.5", props.loading && "animate-pulse")}
        icon={
          <Show
            when={props.expiresAt}
            fallback={<div class="h-5 w-5 i-lucide:key-round text-gray-400 dark:text-gray-500" />}
          >
            <Tooltip
              content={`Expires ${formatDistanceToNow(new Date(props.expiresAt!), { addSuffix: true })}`}
            >
              <div class="h-5 w-5 i-lucide:clock bg-gradient-to-tr from-primary to-secondary" />
            </Tooltip>
          </Show>
        }
        onClick={props.onEdit}
        renderLabel={(label) => {
          return (
            <div class="flex-1 flex items-center gap-1.5">
              <div class="flex items-center flex-1 gap-1.5" title={props.name}>
                <div class={clsx(props.expiresAt && "line-through")}>{label}</div>
                <div class="w-px h-4 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0" />
                <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0 font-mono">
                  {props.prefix}...
                </span>
                <div class="flex-1" />
                <span class={clsx("text-xs text-gray-400 dark:text-gray-500 shrink-0")}>
                  {format(props.createdAt, "MMM d, yyyy")}
                </span>
              </div>
            </div>
          );
        }}
        actions={
          <div onClick={(event: MouseEvent) => event.stopPropagation()}>
            <DropdownMenu
              cardProps={{ class: "w-48" }}
              opened={menuOpened()}
              portal={false}
              setOpened={setMenuOpened}
              trigger={() => (
                <div
                  class={clsx(
                    !menuOpened() && !props.loading && "opacity-20 group-hover:opacity-100"
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

export { APIKeyItem };
