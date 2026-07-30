import { Membership, Role, UserProfile } from "#backend/db";
import { useTree, TreeItem } from "#web/components/tree";
import { DropdownArea, DropdownMenu, IconButton } from "@andesine/components";
import clsx from "clsx";
import { Component, createSignal, createMemo, createEffect, Show } from "solid-js";

const MemberItem: Component<{
  canManage: boolean;
  loading?: boolean;
  member: Membership & { profile: UserProfile; admin?: boolean };
  onRemove(ids: string[]): void;
  onUpdateRole(roleID: string, ids: string[]): void;
  roles: Role[];
}> = (props) => {
  const [{ selection }, { setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const memberName = () => props.member.profile.name || props.member.profile.email;
  const memberEmail = () => {
    if (props.member.profile.email && props.member.profile.email !== memberName()) {
      return props.member.profile.email;
    }

    return "";
  };
  const roleName = () => {
    return props.roles.find((role) => role.id === props.member.roleID)?.name || "";
  };
  const dropdownOptions = createMemo(() => {
    const selectedIDs = selection();
    const isMulti = selectedIDs.length > 1;
    const targetIDs = isMulti ? selectedIDs : [props.member.id];

    return [
      [
        {
          label: "Set role",
          icon: "i-lucide:shield",
          items: props.roles.map((role) => ({
            label: role.name,
            selected: !isMulti && props.member.roleID === role.id,
            onClick: () => props.onUpdateRole(role.id, targetIDs)
          }))
        }
      ],
      [
        {
          label: isMulti ? `Remove ${selectedIDs.length} members` : "Remove",
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
    if (menuOpened()) {
      setSelection((selectedIDs) =>
        selectedIDs.includes(props.member.id) ? selectedIDs : [props.member.id]
      );
    }
  });

  return (
    <DropdownArea>
      <TreeItem
        id={props.member.id}
        label={memberName()}
        topLevel
        checkbox={props.canManage && !props.loading}
        selectable={props.canManage && !props.loading}
        class={clsx("px-1 py-0.5", props.loading && "animate-pulse")}
        icon={<div class="i-lucide:id-card h-5 w-5 text-gray-400 dark:text-gray-500" />}
        renderLabel={(label) => {
          return (
            <div
              class="flex flex-1 items-center gap-1.5"
              title={[memberName(), memberEmail()].filter(Boolean).join(" | ")}
            >
              <div class="max-w-48 truncate">{label}</div>
              <Show when={memberEmail()}>
                <div class="h-4 w-px rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                <span class="max-w-48 truncate text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {memberEmail()}
                </span>
              </Show>
              <div class="flex-1" />
              <Show when={roleName()}>
                <span class="shrink-0 text-xs text-gray-400 dark:text-gray-500">{roleName()}</span>
              </Show>
            </div>
          );
        }}
        actions={
          <Show when={props.canManage}>
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
          </Show>
        }
      />
    </DropdownArea>
  );
};

export { MemberItem };
