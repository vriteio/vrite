import clsx from "clsx";
import { A, useLocation, useParams } from "@solidjs/router";
import { type Component, createMemo, For, Show } from "solid-js";

import { useWorkspace } from "#web/context/workspace";

interface SettingsMenuItem {
  icon: string;
  label: string;
  href: string;
  active?: boolean;
  visible?: boolean;
  subItems?: SettingsMenuItem[];
}

interface SettingsMenuGroup {
  label?: string;
  items: SettingsMenuItem[];
}

interface SettingsMenuItemRowProps {
  item: SettingsMenuItem;
  nested?: boolean;
  activeBackground?: boolean;
}

const SettingsMenuItemRow: Component<SettingsMenuItemRowProps> = (props) => (
  <A
    href={props.item.href}
    class={clsx(
      ":base: group relative flex min-h-7 w-full flex-1 select-none items-center gap-1 overflow-hidden rounded-r-lg pl-0.5 text-left font-medium focus:outline-none",
      !props.nested && ":base: rounded-l-lg",
      !props.item.active &&
        ":base: hover:bg-gradient-to-r hover:from-gray-500/10 hover:to-transparent"
    )}
  >
    <Show when={props.item.active && (props.activeBackground ?? true)}>
      <div
        class={clsx(
          "pointer-events-none absolute inset-0 rounded-r-lg bg-gradient-to-r from-secondary via-primary to-transparent opacity-10",
          !props.nested && "rounded-l-lg"
        )}
      />
    </Show>
    <div class="relative flex h-6 w-6 items-center justify-center">
      <div
        class={clsx(
          "h-5 w-5 text-gray-400 dark:text-gray-500",
          props.item.icon,
          props.item.active && "bg-gradient-to-tr"
        )}
      />
    </div>
    <span class="relative flex-1 line-clamp-1" title={props.item.label}>
      {props.item.label}
    </span>
  </A>
);

const SettingsMenu: Component = () => {
  const location = useLocation();
  const params = useParams<{ workspaceID?: string; keyID?: string; roleID?: string }>();
  const { sessions, currentWorkspace, hasPermission } = useWorkspace();
  const settingsPath = () => `/${params.workspaceID || ""}/settings`;
  const isRoute = (route: string) => location.pathname === `${settingsPath()}${route}`;
  const userName = createMemo(() => {
    const user = sessions().find((session) => session.user.id === currentWorkspace()?.userID)?.user;

    return user?.name || user?.email || "Profile";
  });
  const menu = createMemo<SettingsMenuGroup[]>(() => {
    const editingRole = Boolean(params.roleID);
    const editingKey = Boolean(params.keyID);
    const roleActive = isRoute("/role") || editingRole;
    const keyActive = isRoute("/key") || editingKey;

    return [
      {
        label: "Personal",
        items: [
          {
            icon: "i-lucide:circle-user",
            label: userName(),
            href: `${settingsPath()}/personal`,
            active: isRoute("/personal") || location.pathname === settingsPath()
          }
        ]
      },
      ...(currentWorkspace()
        ? [
            {
              label: "Workspace",
              items: [
                {
                  icon: "i-lucide:hexagon",
                  label: "General",
                  href: `${settingsPath()}/workspace`,
                  active: isRoute("/workspace")
                },
                {
                  icon: "i-lucide:users",
                  label: "People",
                  href: `${settingsPath()}/people`,
                  active: isRoute("/people"),
                  visible: hasPermission("workspace"),
                  subItems: [
                    {
                      icon: "i-lucide:user-plus",
                      label: "Invite member",
                      href: `${settingsPath()}/invite`,
                      active: isRoute("/invite"),
                      visible: hasPermission("workspace")
                    },
                    {
                      icon: "i-lucide:shield-plus",
                      label: editingRole ? "Edit role" : "Create role",
                      href: editingRole
                        ? `${settingsPath()}/role/${encodeURIComponent(params.roleID!)}`
                        : `${settingsPath()}/role`,
                      active: roleActive,
                      visible: hasPermission("workspace")
                    }
                  ]
                },
                {
                  icon: "i-lucide:credit-card",
                  label: "Billing",
                  href: `${settingsPath()}/billing`,
                  active: isRoute("/billing"),
                  visible: hasPermission("read:billing")
                },
                {
                  icon: "i-lucide:code-xml",
                  label: "API",
                  href: `${settingsPath()}/api`,
                  active: isRoute("/api"),
                  visible: hasPermission("read:api_keys"),
                  subItems: [
                    {
                      icon: "i-lucide:key-round",
                      label: editingKey ? "Edit key" : "Create key",
                      href: editingKey
                        ? `${settingsPath()}/key/${encodeURIComponent(params.keyID!)}`
                        : `${settingsPath()}/key`,
                      active: keyActive,
                      visible: Boolean(params.keyID) || hasPermission("read:api_keys")
                    }
                  ]
                }
              ]
            }
          ]
        : [])
    ];
  });

  return (
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-1 scrollbar-sm">
      <h2 class="my-0.5 text-2xl font-semibold">Settings</h2>
      <div class="flex flex-col gap-3">
        <For each={menu()}>
          {(subMenu) => (
            <div class="flex min-w-0 flex-col">
              <Show when={subMenu.label}>
                <span class="ml-1 text-gray-400 dark:text-gray-500 text-xs leading-normal">
                  {subMenu.label}
                </span>
              </Show>
              <div class="flex flex-col gap-0.5">
                <For each={subMenu.items.filter((item) => item.visible ?? true)}>
                  {(item) => {
                    const activeChild = () => {
                      return item.subItems?.find((subItem) => {
                        return (subItem.visible ?? true) && subItem.active;
                      });
                    };

                    return (
                      <>
                        <SettingsMenuItemRow item={item} />
                        <Show when={activeChild()}>
                          {(child) => (
                            <div class="relative flex">
                              <div class="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-secondary via-primary to-transparent opacity-10" />
                              <div class="relative flex min-w-3.5 items-center justify-end pl-0.5">
                                <div class="h-full w-px rounded-full bg-gray-300 dark:bg-gray-600" />
                              </div>
                              <div class="relative flex flex-1 flex-col">
                                <SettingsMenuItemRow
                                  item={child()}
                                  nested
                                  activeBackground={false}
                                />
                              </div>
                            </div>
                          )}
                        </Show>
                      </>
                    );
                  }}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export { SettingsMenu };
