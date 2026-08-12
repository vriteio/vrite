import { Card, DropdownArea, DropdownMenu, IconButton, Tooltip } from "@andesine/components";
import {
  type Component,
  ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  Show
} from "solid-js";
import clsx from "clsx";
import { TreeItem, useTree } from "#web/components/tree";
import type { KeyPermission } from "#web/lib/api";
import { format, formatDistanceToNow } from "date-fns";

interface APIKeyItemProps {
  canManage: boolean;
  id: string;
  name: string;
  prefix: string;
  permissions: KeyPermission[];
  createdAt: Date | string;
  expiresAt: string | null;
  loading?: boolean;
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
      ...(!isMulti && !props.expiresAt
        ? [
            [
              { label: "Edit", icon: "i-lucide:pencil", onClick: props.onEdit },
              {
                label: "Rotate key",
                icon: "i-lucide:rotate-ccw-key",
                onClick: props.onRotate
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
        checkbox={props.canManage && !props.loading && !props.expiresAt}
        selectable={props.canManage && !props.loading && !props.expiresAt}
        class={clsx("px-1 py-0.5", props.loading && "animate-pulse")}
        icon={
          <Show
            when={props.expiresAt}
            fallback={<div class="h-5 w-5 i-lucide:key-round text-gray-400" />}
          >
            <Tooltip
              content={`Expires ${formatDistanceToNow(new Date(props.expiresAt!), { addSuffix: true })}`}
            >
              <div class="h-5 w-5 i-lucide:clock bg-gradient-to-tr from-primary to-secondary" />
            </Tooltip>
          </Show>
        }
        onClick={props.canManage ? props.onEdit : undefined}
        renderLabel={(label) => (
          <div class="flex min-w-0 flex-1 items-center gap-1.5">
            <div class="flex min-w-0 flex-1 items-center gap-1.5" title={props.name}>
              <div class={clsx("min-w-0 truncate", props.expiresAt && "line-through")}>{label}</div>
              <div class="hidden h-4 w-px shrink-0 rounded-full bg-gray-200 md:block" />
              <span class="hidden shrink-0 font-mono text-xs text-gray-400 md:inline">
                {props.prefix}...
              </span>
              <div class="flex-1" />
              <span class={clsx("text-xs text-gray-400 shrink-0")}>
                {format(props.createdAt, "MMM d, yyyy")}
              </span>
            </div>
          </div>
        )}
        actions={
          <Show when={props.canManage}>
            <div onClick={(event: MouseEvent) => event.stopPropagation()}>
              <DropdownMenu
                title={props.name}
                cardProps={
                  {
                    "class": "w-48",
                    "data-tree-interaction": ""
                  } as Partial<ComponentProps<typeof Card>>
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
          </Show>
        }
      />
    </DropdownArea>
  );
};

export { APIKeyItem };
