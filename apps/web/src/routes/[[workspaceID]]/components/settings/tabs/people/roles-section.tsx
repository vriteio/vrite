import {
  DropdownArea,
  IconButton,
  Skeleton,
  DropdownMenu,
  MenuItem,
  Spinner
} from "@andesine/components";
import clsx from "clsx";
import { Component, createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { client, Permission } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";
import {
  TreeProvider,
  TreeSelection,
  TreeLevel,
  TreeItem,
  useTree,
  type TreeMap
} from "#web/components/tree";
import { action, useAction, useSubmission } from "@solidjs/router";

const deleteRolesAction = action(async (input: { ids: string[] }) => {
  for (const id of input.ids) {
    const [error] = await client.roles.delete({ id });

    if (error) throw error;
  }

  return input;
});

const permissionLabels: Record<string, string> = {
  "content": "Content",
  "api_keys": "API Keys",
  "read:api_keys": "Read API Keys",
  "billing": "Billing",
  "read:billing": "Read Billing",
  "workspace": "Workspace"
};

interface Role {
  id: string;
  name: string;
  baseRole?: string | null;
  permissions: string[];
}

interface RolesSectionProps {
  canManageRoles: boolean;
  roles: Role[];
  onCreateRole: () => void;
  onEditRole: (role: { id: string; name: string; permissions: Permission[] }) => void;
  onRolesChanged?: () => Promise<void> | void;
}

const RoleItem: Component<{
  id: string;
  name: string;
  baseRole: string | undefined;
  permissions: string[];
  canManageRoles: boolean;
  onEdit: () => void;
  onDeleteRoles: (ids: string[]) => void;
  findRole: (id: string) => Role | undefined;
}> = (props) => {
  const [{ selection }, { setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const dropdownOptions = createMemo((): MenuItem[][] => {
    const sel = selection();
    const isMulti = sel.length > 1;
    const deletableIds = isMulti
      ? sel.filter((id) => {
          const r = props.findRole(id);
          return r && !r.baseRole;
        })
      : [props.id];
    const opts: MenuItem[][] = [];

    if (!isMulti) {
      if (props.canManageRoles) {
        opts.push([
          {
            label: "Edit",
            icon: "i-lucide:pencil",
            onClick: props.onEdit
          }
        ]);
      }
    }

    if (props.canManageRoles && deletableIds.length > 0) {
      opts.push([
        {
          label: deletableIds.length > 1 ? `Delete ${deletableIds.length} roles` : "Delete",
          icon: "i-lucide:trash",
          color: "danger" as const,
          onClick: () => {
            props.onDeleteRoles(deletableIds);
            setSelection([]);
          }
        }
      ]);
    }

    return opts;
  });

  createEffect(() => {
    if (menuOpened()) {
      setSelection((sel) => (sel.includes(props.id) ? sel : [props.id]));
    }
  });

  return (
    <DropdownArea>
      <TreeItem
        id={props.id}
        label={props.name}
        topLevel
        selectable={props.canManageRoles && !props.baseRole}
        class="px-1 py-0.5"
        icon={<div class="i-lucide:shield h-5.5 w-5.5 text-gray-400 dark:text-gray-500" />}
        onClick={() => {
          if (props.canManageRoles && !props.baseRole) props.onEdit();
        }}
        actions={
          <Show when={props.canManageRoles && !props.baseRole}>
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
                    />
                  </div>
                )}
                items={dropdownOptions()}
              />
            </div>
          </Show>
        }
      >
        <div class="flex-1 flex items-center gap-1.5">
          <div class="flex-1 line-clamp-1" title={props.name}>
            {props.name}
          </div>
          <Show when={props.baseRole}>
            <span class="text-xs px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 shrink-0">
              System
            </span>
          </Show>
          <Show when={props.permissions.length > 0}>
            <div class="flex gap-1 shrink-0 flex-wrap">
              <For each={props.permissions}>
                {(perm) => (
                  <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    {permissionLabels[perm] || perm}
                  </span>
                )}
              </For>
            </div>
          </Show>
          <Show when={props.permissions.length === 0 && !props.baseRole}>
            <div class="w-px h-4 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0" />
            <span class="text-xs text-gray-400 dark:text-gray-500">No permissions</span>
          </Show>
        </div>
      </TreeItem>
    </DropdownArea>
  );
};

const RolesSection: Component<RolesSectionProps> = (props) => {
  const notify = useNotify();
  const deleteRoles = useAction(deleteRolesAction);
  const deleteRolesSubmission = useSubmission(deleteRolesAction);
  const mutationText = createMemo(() => {
    if (!deleteRolesSubmission.pending) {
      return null;
    }

    const count = deleteRolesSubmission.input?.[0]?.ids.length ?? 0;

    return count > 1 ? `Deleting ${count} roles...` : "Deleting role...";
  });
  const rolesTree = createMemo<TreeMap>(() => ({
    "*": {
      items: props.roles.map((r) => r.id),
      levels: []
    }
  }));
  const findRole = (id: string) => props.roles.find((r) => r.id === id);

  const handleDeleteRoles = async (ids: string[]) => {
    try {
      await deleteRoles({ ids });
      await props.onRolesChanged?.();

      notify({
        type: "success",
        text: ids.length > 1 ? `${ids.length} roles deleted` : "Role deleted"
      });
    } catch (error) {
      notify({ type: "error", text: "Failed to delete roles" });
      await props.onRolesChanged?.();
    }
  };

  return (
    <SettingsSection label="Roles & Permissions">
      <div class="flex flex-col gap-2">
        <Setting
          label="Roles"
          description="Manage roles and their permissions for workspace members"
        >
          <Show when={props.canManageRoles}>
            <IconButton
              label={() => <span class="px-1">Create role</span>}
              class="flex-row-reverse pr-1"
              onClick={props.onCreateRole}
              iconProps={{ class: "h-4 w-4" }}
              icon="i-lucide:plus"
              size="small"
              color="contrast"
              variant="outlined"
              text="soft"
              disabled={Boolean(mutationText())}
            />
          </Show>
        </Setting>
        <Show when={mutationText()}>
          <div class="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <Spinner class="h-4 w-4" />
            <span>{mutationText()}</span>
          </div>
        </Show>
        <div class="w-full flex flex-col gap-1.5">
          <Show
            when={props.roles.length}
            fallback={
              <span class="text-sm text-gray-400 dark:text-gray-500">
                No roles yet. Create a role to grant a custom set of workspace permissions.
              </span>
            }
          >
            <TreeProvider tree={rolesTree} itemHeight={32}>
              <div class="relative flex flex-col">
                <TreeSelection />
                <TreeLevel
                  levelID="*"
                  tree={rolesTree}
                  renderLevel={() => <></>}
                  renderItem={(itemID) => {
                    const role = () => findRole(itemID);

                    return (
                      <Show when={role()}>
                        {(r) => (
                          <div class="relative">
                            <RoleItem
                              id={r().id}
                              name={r().name}
                              baseRole={r().baseRole ?? undefined}
                              permissions={r().permissions}
                              canManageRoles={props.canManageRoles && !mutationText()}
                              onEdit={() =>
                                props.onEditRole({
                                  id: r().id,
                                  name: r().name,
                                  permissions: r().permissions as Permission[]
                                })
                              }
                              onDeleteRoles={handleDeleteRoles}
                              findRole={findRole}
                            />
                          </div>
                        )}
                      </Show>
                    );
                  }}
                />
              </div>
            </TreeProvider>
          </Show>
        </div>
      </div>
    </SettingsSection>
  );
};

export { RolesSection };
