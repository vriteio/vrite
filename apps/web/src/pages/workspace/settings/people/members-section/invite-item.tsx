import { Invite, Role } from "#backend/db";
import { useTree, TreeItem } from "#web/components/tree";
import { DropdownArea, DropdownMenu, IconButton } from "@andesine/components";
import clsx from "clsx";
import { format } from "date-fns";
import { Component, createSignal, createMemo, createEffect } from "solid-js";

const InviteItem: Component<{
  invite: Invite & { inviteLink: string };
  roles: Role[];
  loading?: boolean;
  onCopyLink(link: string): void;
  onRevoke(ids: string[]): void;
  onResend(ids: string[]): void;
}> = (props) => {
  const [{ selection }, { setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const inviteEmail = () => props.invite.email;
  const inviteRoleName = () => {
    return props.roles.find((role) => role.id === props.invite.roleID)?.name || "";
  };
  const dropdownOptions = createMemo(() => {
    const selectedIDs = selection();
    const isMulti = selectedIDs.length > 1;
    const targetIDs = isMulti ? selectedIDs : [props.invite.id];

    return [
      ...(!isMulti
        ? [
            [
              {
                label: "Copy invite link",
                icon: "i-lucide:link",
                onClick: () => props.onCopyLink(props.invite.inviteLink)
              }
            ]
          ]
        : []),
      [
        {
          label: isMulti ? `Resend ${selectedIDs.length} invitations` : "Resend invitation",
          icon: "i-lucide:send",
          onClick: () => props.onResend(targetIDs)
        },
        {
          label: isMulti ? `Revoke ${selectedIDs.length} invitations` : "Revoke invitation",
          icon: "i-lucide:x",
          color: "danger" as const,
          onClick: () => {
            props.onRevoke(targetIDs);
            setSelection([]);
          }
        }
      ]
    ];
  });

  createEffect(() => {
    if (menuOpened()) {
      setSelection((selectedIDs) =>
        selectedIDs.includes(props.invite.id) ? selectedIDs : [props.invite.id]
      );
    }
  });

  return (
    <DropdownArea>
      <TreeItem
        id={props.invite.id}
        label={props.invite.email}
        topLevel
        checkbox={!props.loading}
        selectable={!props.loading}
        class={clsx("px-1 py-0.5", props.loading && "animate-pulse")}
        icon={<div class="i-lucide:mail h-5 w-5 text-gray-400 dark:text-gray-500" />}
        renderLabel={(label) => (
          <div
            class="flex flex-1 items-center gap-1.5"
            title={`${inviteEmail()} | ${inviteRoleName()}`}
          >
            <div class="max-w-48 truncate">{label}</div>
            <div class="h-4 w-px shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
            <span class="shrink-0 text-xs text-gray-400 dark:text-gray-500">
              {inviteRoleName()}
            </span>
            <div class="flex-1" />
            <span class="shrink-0 text-xs text-gray-400 dark:text-gray-500">
              {format(props.invite.createdAt, "MMM d, yyyy")}
            </span>
          </div>
        )}
        actions={
          <div onClick={(event: MouseEvent) => event.stopPropagation()}>
            <DropdownMenu
              cardProps={{ class: "w-52" }}
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

export { InviteItem };
