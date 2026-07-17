import {
  DropdownArea,
  IconButton,
  DropdownMenu,
  MenuItem,
  Spinner,
  Skeleton,
  Card
} from "@andesine/components";
import clsx from "clsx";
import { Component, createEffect, createMemo, createSignal, Show } from "solid-js";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { Tree, TreeItem, TREE_ROOT_ID, useTree, type TreeMap } from "#web/components/tree";

interface Member {
  id: string;
  profile: { name?: string | null; email?: string | null };
  roleID?: string | null;
  admin?: boolean;
}

interface Invite {
  id: string;
  email: string;
  roleID?: string | null;
  createdAt: string;
}

interface MembersSectionProps {
  roles: Array<{ id: string; name: string }>;
  members: Member[];
  invites: Invite[];
  mutationText?: string | null;
  onInvite: () => void;
  onUpdateRole: (memberIDs: string[], roleID: string) => void;
  onRemove: (memberIDs: string[]) => void;
  onRevokeInvite: (inviteIDs: string[]) => void;
  loading?: boolean;
}

const MemberItem: Component<{
  id: string;
  name: string;
  email?: string | null;
  roleID?: string | null;
  admin?: boolean;
  disabled?: boolean;
  roles: Array<{ id: string; name: string }>;
  getRoleName: (roleID?: string | null) => string;
  onUpdateRole: (roleID: string, memberIDs: string[]) => void;
  onRemove: (ids: string[]) => void;
}> = (props) => {
  const [{ selection }, { setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);

  const dropdownOptions = createMemo((): MenuItem[][] => {
    const sel = selection();
    const isMulti = sel.length > 1;
    const selectedMemberIDs = isMulti ? sel : [props.id];
    const opts: MenuItem[][] = [];

    opts.push([
      {
        label: "Set role",
        icon: "i-lucide:shield" as const,
        items: props.roles.map((role) => ({
          label: role.name,
          selected: !isMulti && props.roleID === role.id,
          onClick: () => props.onUpdateRole(role.id, selectedMemberIDs)
        }))
      }
    ]);

    opts.push([
      {
        label: isMulti ? `Remove ${sel.length} members` : "Remove",
        icon: "i-lucide:trash",
        color: "danger" as const,
        onClick: () => {
          props.onRemove(isMulti ? sel : [props.id]);
          setSelection([]);
        }
      }
    ]);

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
        checkboxesEnabled={!props.disabled}
        class="px-1 py-0.5"
        icon={<div class="i-lucide:user h-5 w-5 text-gray-400 dark:text-gray-500" />}
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
        <div class="flex-1 flex items-center gap-1.5">
          <div class="flex-1 line-clamp-1" title={props.name}>
            {props.name}
          </div>
          <Show when={props.email && props.email !== props.name}>
            <span class="text-xs text-gray-400 dark:text-gray-500 truncate shrink-0">
              {props.email}
            </span>
          </Show>
          <div class="w-px h-4 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0" />
          <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">
            {props.getRoleName(props.roleID)}
          </span>
          <Show when={props.admin}>
            <span class="text-xs px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 shrink-0">
              Admin
            </span>
          </Show>
        </div>
      </TreeItem>
    </DropdownArea>
  );
};

const InviteItem: Component<{
  id: string;
  email: string;
  roleID?: string | null;
  createdAt: string;
  disabled?: boolean;
  getRoleName: (roleID?: string | null) => string;
  onRevoke: (ids: string[]) => void;
}> = (props) => {
  const [{ selection }, { setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);

  const dropdownOptions = createMemo((): MenuItem[][] => {
    const sel = selection();
    const isMulti = sel.length > 1;

    return [
      [
        {
          label: isMulti ? `Revoke ${sel.length} invites` : "Revoke",
          icon: "i-lucide:x",
          color: "danger" as const,
          onClick: () => {
            props.onRevoke(isMulti ? sel : [props.id]);
            setSelection([]);
          }
        }
      ]
    ];
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
        label={props.email}
        topLevel
        checkboxesEnabled={!props.disabled}
        class="px-1 py-0.5"
        icon={<div class="i-lucide:mail h-5 w-5 text-gray-400 dark:text-gray-500" />}
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
        <div class="flex-1 flex items-center gap-1.5">
          <div class="flex-1 line-clamp-1" title={props.email}>
            {props.email}
          </div>
          <div class="w-px h-4 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0" />
          <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">
            {props.getRoleName(props.roleID)}
          </span>
          <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">
            {new Date(props.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric"
            })}
          </span>
        </div>
      </TreeItem>
    </DropdownArea>
  );
};

const MembersSection: Component<MembersSectionProps> = (props) => {
  const isMutating = () => Boolean(props.mutationText);

  const getRoleName = (roleID?: string | null) => {
    if (!roleID) return "No role";

    const role = props.roles.find((r) => r.id === roleID);

    return role?.name || "Unknown";
  };

  const membersTree = createMemo<TreeMap>(() => ({
    [TREE_ROOT_ID]: { items: props.members.map((m) => m.id), levels: [] }
  }));

  const invitesTree = createMemo<TreeMap>(() => ({
    [TREE_ROOT_ID]: { items: props.invites.map((i) => i.id), levels: [] }
  }));

  return (
    <>
      <SettingsSection label="Members">
        <Setting
          label="Workspace Members"
          description="Manage people who have access to this workspace"
        >
          <Show when={!props.loading} fallback={<Skeleton class="h-8 w-20 rounded-lg" />}>
            <IconButton
              label={() => <span class="px-1">Invite</span>}
              class="flex-row-reverse pr-1"
              onClick={props.onInvite}
              iconProps={{ class: "h-4 w-4" }}
              icon="i-lucide:plus"
              size="small"
              color="contrast"
              variant="outlined"
              text="soft"
              disabled={isMutating()}
            />
          </Show>
        </Setting>
        <Show when={props.mutationText}>
          <div class="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <Spinner class="h-4 w-4" />
            <span>{props.mutationText}</span>
          </div>
        </Show>
        <div class="w-full flex flex-col gap-1.5">
          <Show when={props.loading}>
            <Skeleton class={["h-8", "h-8", "h-8"]} />
          </Show>
          <Show
            when={!props.loading && props.members.length}
            fallback={
              <Show when={!props.loading}>
                <Card>
                  No members yet. Invite teammates to start collaborating in this workspace.
                </Card>
              </Show>
            }
          >
            <Tree
              tree={membersTree}
              renderLevel={() => <></>}
              renderItem={(itemID) => {
                const member = () => props.members.find((m) => m.id === itemID);

                return (
                  <Show when={member()}>
                    {(m) => (
                      <div class="relative">
                        <MemberItem
                          id={m().id}
                          name={m().profile.name || m().profile.email || "Unknown"}
                          email={m().profile.email}
                          roleID={m().roleID}
                          admin={m().admin}
                          disabled={isMutating()}
                          roles={props.roles}
                          getRoleName={getRoleName}
                          onUpdateRole={(roleID, memberIDs) =>
                            props.onUpdateRole(memberIDs, roleID)
                          }
                          onRemove={props.onRemove}
                        />
                      </div>
                    )}
                  </Show>
                );
              }}
            />
          </Show>
        </div>
      </SettingsSection>

      <SettingsSection label="Pending Invites">
        <Setting
          label="Pending invitations"
          description="Invitations that have not yet been accepted or revoked"
        />
        <div class="w-full flex flex-col gap-1.5">
          <Show when={props.loading}>
            <Skeleton class={["h-8", "h-8"]} />
          </Show>
          <Show
            when={!props.loading && props.invites.length > 0}
            fallback={
              <Show when={!props.loading}>
                <Card class="rounded-lg text-gray-500 bg-white text-sm px-2 py-1.5" shade>
                  No pending invites. New invitations will show up here until they are accepted.
                </Card>
              </Show>
            }
          >
            <Tree
              tree={invitesTree}
              renderLevel={() => <></>}
              renderItem={(itemID) => {
                const invite = () => props.invites.find((i) => i.id === itemID);
                return (
                  <Show when={invite()}>
                    {(inv) => (
                      <div class="relative">
                        <InviteItem
                          id={inv().id}
                          email={inv().email}
                          roleID={inv().roleID}
                          createdAt={inv().createdAt}
                          disabled={isMutating()}
                          getRoleName={getRoleName}
                          onRevoke={props.onRevokeInvite}
                        />
                      </div>
                    )}
                  </Show>
                );
              }}
            />
          </Show>
        </div>
      </SettingsSection>
    </>
  );
};

export { MembersSection };
