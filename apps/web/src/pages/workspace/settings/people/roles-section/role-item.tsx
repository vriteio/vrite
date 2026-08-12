import { type Role } from "#backend/db";
import { useTree, TreeItem } from "#web/components/tree";
import { Card, DropdownArea, DropdownMenu, IconButton, Tooltip } from "@andesine/components";
import clsx from "clsx";
import {
  type Component,
  createSignal,
  createMemo,
  createEffect,
  Match,
  Switch,
  ComponentProps
} from "solid-js";

const RoleItem: Component<{
  canManage: boolean;
  role: Role;
  roles: Role[];
  onDelete(ids: string[]): void;
  onEdit(): void;
}> = (props) => {
  const [{ selection }, { setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const editable = () => props.canManage && !props.role.baseRole;
  const dropdownOptions = createMemo(() => {
    const selectedIDs = selection();
    const isMulti = selectedIDs.length > 1;
    const deletableIDs = (isMulti ? selectedIDs : [props.role.id]).filter((id) => {
      return !props.roles.find((role) => role.id === id)?.baseRole;
    });

    return [
      ...(!isMulti ? [[{ label: "Edit", icon: "i-lucide:pencil", onClick: props.onEdit }]] : []),
      ...(deletableIDs.length
        ? [
            [
              {
                label: deletableIDs.length > 1 ? `Delete ${deletableIDs.length} roles` : "Delete",
                icon: "i-lucide:trash",
                color: "danger" as const,
                onClick: () => {
                  props.onDelete(deletableIDs);
                  setSelection([]);
                }
              }
            ]
          ]
        : [])
    ];
  });

  createEffect(() => {
    if (menuOpened()) {
      setSelection((selectedIDs) =>
        selectedIDs.includes(props.role.id) ? selectedIDs : [props.role.id]
      );
    }
  });

  return (
    <DropdownArea>
      <TreeItem
        id={props.role.id}
        label={props.role.name}
        topLevel
        checkbox={editable()}
        selectable={editable()}
        class="px-1 py-0.5 min-h-8"
        icon={<div class="i-lucide:shield h-5.5 w-5.5 text-gray-400" />}
        onClick={() => editable() && props.onEdit()}
        renderLabel={(label) => (
          <div class="flex min-w-0 flex-1 items-center gap-1.5">
            <div class="min-w-0 flex-1 truncate" title={props.role.name}>
              {label}
            </div>
            <span class="shrink-0 text-xs text-gray-400">
              {props.role.baseRole
                ? "System role"
                : props.role.permissions.length
                  ? `${props.role.permissions.length} permission${props.role.permissions.length === 1 ? "" : "s"}`
                  : "No permissions"}
            </span>
          </div>
        )}
        actions={
          <Switch>
            <Match when={editable()}>
              <div onClick={(event: MouseEvent) => event.stopPropagation()}>
                <DropdownMenu
                  title={props.role.name}
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
                        !menuOpened() && "opacity-20 media-mouse:group-hover:opacity-100"
                      )}
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
            </Match>
            <Match when={props.role.baseRole}>
              <Tooltip
                content={
                  <div class="max-w-32 leading-tight whitespace-pre-wrap">
                    {props.role.baseRole === "admin"
                      ? "Admin is a full-access system role and cannot be edited or deleted"
                      : "Viewer is a minimum-access system role and cannot be edited or deleted"}
                  </div>
                }
              >
                <div
                  class={clsx(!menuOpened() && "opacity-20 media-mouse:group-hover:opacity-100")}
                >
                  <IconButton
                    icon="i-lucide:lock"
                    iconProps={{ class: "h-4 w-4" }}
                    class="h-7 w-7"
                    size="small"
                    variant="text"
                    text="soft"
                  />
                </div>
              </Tooltip>
            </Match>
          </Switch>
        }
      />
    </DropdownArea>
  );
};

export { RoleItem };
