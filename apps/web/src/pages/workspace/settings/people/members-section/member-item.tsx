import { type Membership, type Role, type UserProfile } from "#backend/db";
import { useTree, TreeItem } from "#web/components/tree";
import { Card, DropdownArea, DropdownMenu, IconButton } from "@andesine/components";
import clsx from "clsx";
import {
  type Component,
  createSignal,
  createMemo,
  createEffect,
  Show,
  ComponentProps
} from "solid-js";

const MemberItem: Component<{
  canManage: boolean;
  currentUser?: boolean;
  loading?: boolean;
  member: Membership & { profile: UserProfile; admin?: boolean };
  members: Array<Membership & { profile: UserProfile; admin?: boolean }>;
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
  const affectsEveryAdmin = (ids: string[]) => {
    const adminIDs = props.members.filter((member) => member.admin).map((member) => member.id);

    return adminIDs.length > 0 && adminIDs.every((id) => ids.includes(id));
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
            disabled:
              role.baseRole !== "admin" && affectsEveryAdmin(targetIDs)
                ? "At least one workspace admin is required"
                : undefined,
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
          disabled: affectsEveryAdmin(targetIDs)
            ? "At least one workspace admin is required"
            : undefined,
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
        icon={<div class="i-lucide:id-card h-5 w-5 text-gray-400" />}
        renderLabel={(label) => (
          <div
            class="flex min-w-0 flex-1 items-center gap-1.5"
            title={[memberName(), memberEmail()].filter(Boolean).join(" | ")}
          >
            <div class="min-w-0 max-w-48 truncate">{label}</div>
            <Show when={memberEmail()}>
              <div class="hidden h-4 w-px shrink-0 rounded-full bg-gray-200 md:block" />
              <span class="hidden max-w-48 shrink-0 truncate text-xs text-gray-400 md:inline">
                {memberEmail()}
                <Show when={props.currentUser}>
                  {" "}
                  <span class="inline-block px-1 py-px rounded-md from-secondary via-primary to-secondary bg-gradient-to-tr text-white">
                    You
                  </span>
                </Show>
              </span>
            </Show>
            <div class="flex-1" />
            <Show when={roleName()}>
              <span class="shrink-0 text-xs text-gray-400">{roleName()}</span>
            </Show>
          </div>
        )}
        actions={
          <Show when={props.canManage}>
            <div onClick={(event: MouseEvent) => event.stopPropagation()}>
              <DropdownMenu
                title={memberName()}
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

export { MemberItem };
