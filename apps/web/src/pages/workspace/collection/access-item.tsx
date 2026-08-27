import { type Card, DropdownArea, DropdownMenu, IconButton } from "@andesine/components";
import clsx from "clsx";
import {
  type Component,
  type ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  Show
} from "solid-js";
import { TreeItem, useTree } from "#web/components/tree";
import type { Role } from "#web/lib/api";

interface AccessItemProps {
  detail: string;
  disabled: boolean;
  icon: string;
  id: string;
  label: string;
  loading: boolean;
  roleID: string;
  roles: Role[];
  onRemove(ids: string[]): void;
  onSetRole(ids: string[], roleID: string): void;
}

const AccessItem: Component<AccessItemProps> = (props) => {
  const [{ selection }, { setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const roleName = () =>
    props.roles.find((role) => role.id === props.roleID)?.name || "Unknown role";
  const dropdownOptions = createMemo(() => {
    const selectedIDs = selection();
    const isMulti = selectedIDs.length > 1;
    const targetIDs = isMulti ? selectedIDs : [props.id];

    return [
      [
        {
          label: "Set role",
          icon: "i-lucide:shield",
          items: props.roles.map((role) => ({
            label: role.name,
            selected: !isMulti && props.roleID === role.id,
            onClick: () => props.onSetRole(targetIDs, role.id)
          }))
        }
      ],
      [
        {
          label: isMulti ? `Remove access for ${targetIDs.length}` : "Remove access",
          icon: "i-lucide:trash",
          color: "danger" as const,
          onClick: () => {
            props.onRemove(targetIDs);
            setSelection([]);
          }
        }
      ]
    ];
  });

  createEffect(() => {
    if (!menuOpened()) return;

    setSelection((selectedIDs) => {
      return selectedIDs.includes(props.id) ? selectedIDs : [props.id];
    });
  });

  return (
    <DropdownArea>
      <TreeItem
        id={props.id}
        label={props.label}
        topLevel
        checkbox={!props.disabled}
        selectable={!props.disabled}
        class={clsx("px-1 py-0.5", props.loading && "animate-pulse")}
        icon={<div class={clsx(props.icon, "h-5 w-5 text-gray-400")} />}
        onClick={() => {
          if (!props.disabled) setSelection([props.id]);
        }}
        renderLabel={(label) => (
          <div
            class="flex min-w-0 flex-1 items-center gap-1.5"
            title={[props.label, props.detail].filter(Boolean).join(" | ")}
          >
            <div class="min-w-0 max-w-48 truncate">{label}</div>
            <Show when={props.detail}>
              <div class="hidden h-4 w-px shrink-0 rounded-full bg-gray-200 md:block" />
              <span class="hidden max-w-48 shrink-0 truncate text-xs text-gray-400 md:inline">
                {props.detail}
              </span>
            </Show>
            <div class="flex-1" />
            <span class="shrink-0 text-xs text-gray-400">{roleName()}</span>
          </div>
        )}
        actions={
          <div onClick={(event: MouseEvent) => event.stopPropagation()}>
            <DropdownMenu
              title={props.label}
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
                  class={clsx(
                    !menuOpened() &&
                      !props.disabled &&
                      "opacity-20 media-mouse:group-hover:opacity-100"
                  )}
                >
                  <IconButton
                    icon="i-lucide:ellipsis-vertical"
                    size="small"
                    variant="text"
                    text="soft"
                    disabled={props.disabled}
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

export { AccessItem };
