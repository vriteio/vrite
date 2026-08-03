import { Card, IconButton, Skeleton } from "@andesine/components";
import { createAsync, query, revalidate, useNavigate, useParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { Component, createMemo, createSignal, Show, Suspense, useTransition } from "solid-js";

import { Tree, TREE_ROOT_ID, type TreeMap } from "#web/components/tree";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { settleBulkAction } from "#web/lib/bulk-action";
import { client, Invite, Membership, Role, UserProfile } from "#web/lib/client";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { ActionConfirmationDialog, AffectedItem } from "../action-confirmation-dialog";
import { RoleItem } from "./role-item";

interface WorkspaceMember extends Membership {
  admin?: boolean;
  profile: UserProfile;
}

interface InviteDetails extends Invite {
  inviteLink: string;
  workspaceID: string;
}

interface RoleListProps {
  canManage: boolean;
  currentUserID?: string;
  invites: InviteDetails[];
  members: WorkspaceMember[];
  refreshing?: boolean;
  refresh(onRevalidated?: () => void): void;
  roles: Role[];
}

const membershipsQuery = query(() => client.memberships.list(), "memberships");
const invitesQuery = query(() => client.memberships.listInvites(), "invites");
const rolesQuery = query(() => client.roles.list(), "roles");

const RoleList: Component<RoleListProps> = (props) => {
  const notify = useNotify();
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string }>();
  const settingsPath = () => `/${params.workspaceID || ""}/settings`;
  const [pendingDeleteIDs, setPendingDeleteIDs] = createSignal<string[]>([]);
  const deleteMutation = createMutation(() => ({
    mutationFn: ({ ids }: { ids: string[] }) => {
      return settleBulkAction(ids, (id) => client.roles.delete({ id }));
    },
    onSuccess: (result) => {
      result.failed.forEach(({ error }) => console.error(error));
      props.refresh(() => {
        deleteMutation.reset();

        if (result.successful.length > 0) {
          notify({
            type: "success",
            text:
              result.successful.length > 1
                ? `${result.successful.length} roles deleted`
                : "Role deleted"
          });
        }

        if (result.failed.length > 0) {
          notify({
            type: "error",
            text:
              result.failed.length > 1
                ? `${result.failed.length} roles failed to delete`
                : "Failed to delete role"
          });
        }
      });
    }
  }));
  const optimisticRoles = createMemo(() => {
    let roles = props.roles;

    if ((deleteMutation.isPending || props.refreshing) && deleteMutation.variables) {
      roles = roles.filter((role) => !deleteMutation.variables!.ids.includes(role.id));
    }

    return [
      ...roles.filter((role) => !role.baseRole),
      ...roles.filter((role) => Boolean(role.baseRole))
    ];
  });
  const rolesTree = createMemo<TreeMap>(() => ({
    [TREE_ROOT_ID]: { items: optimisticRoles().map((role) => role.id), levels: [] }
  }));
  const affectedMembers = createMemo(() => {
    return props.members.filter((member) => pendingDeleteIDs().includes(member.roleID));
  });
  const affectedItems = createMemo<AffectedItem[]>(() => {
    const members: AffectedItem[] = affectedMembers().map((member) => ({
      detail: "Member — will be moved to Viewer",
      id: member.id,
      label: member.profile.name || member.profile.email
    }));
    const invites: AffectedItem[] = props.invites
      .filter((invite) => pendingDeleteIDs().includes(invite.roleID))
      .map((invite) => ({
        detail: "Pending invitation — will be moved to Viewer",
        icon: "i-lucide:mail",
        id: invite.id,
        label: invite.email
      }));

    return [...members, ...invites];
  });
  const deletedRoleNames = createMemo(() => {
    return props.roles
      .filter((role) => pendingDeleteIDs().includes(role.id))
      .map((role) => role.name);
  });

  return (
    <>
      <Show
        when={optimisticRoles().length}
        fallback={
          <Card
            class="flex h-16 items-center justify-center gap-1 rounded-lg bg-white px-2 text-sm text-gray-400"
            shade
          >
            <div class="i-lucide:shield h-5.5 w-5.5 text-gray-300" />
            No workspace roles
          </Card>
        }
      >
        <Tree
          tree={rolesTree}
          itemHeight={32}
          renderItem={(itemID) => {
            const role = () => optimisticRoles().find((current) => current.id === itemID)!;

            return (
              <RoleItem
                role={role()}
                roles={optimisticRoles()}
                canManage={props.canManage}
                onEdit={() => navigate(`${settingsPath()}/role/${encodeURIComponent(role().id)}`)}
                onDelete={setPendingDeleteIDs}
              />
            );
          }}
        />
      </Show>
      <ActionConfirmationDialog
        opened={pendingDeleteIDs().length > 0}
        title={`Delete ${deletedRoleNames().length === 1 ? "role" : `${deletedRoleNames().length} roles`}?`}
        description={
          affectedItems().length > 0
            ? "The affected members and pending invitations will be reassigned to Viewer."
            : "These roles are not assigned to any members or pending invitations."
        }
        affected={affectedItems()}
        warning={
          affectedMembers().some((member) => member.userID === props.currentUserID)
            ? "This includes you. Your permissions will immediately change to Viewer."
            : undefined
        }
        confirmLabel="Delete"
        danger
        onClose={() => setPendingDeleteIDs([])}
        onConfirm={() => {
          const ids = pendingDeleteIDs();

          setPendingDeleteIDs([]);
          deleteMutation.mutate({ ids });
        }}
      />
    </>
  );
};

const RolesSection: Component = () => {
  const { currentWorkspace, hasPermission } = useWorkspace();
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string }>();
  const invites = createAsync(() => invitesQuery());
  const members = createAsync(() => membershipsQuery());
  const roles = createAsync(() => rolesQuery());
  const [refreshing, startRefresh] = useTransition();
  const canManage = () => hasPermission("workspace");
  const refresh = (onRevalidated = () => {}) => {
    startRefresh(async () => {
      await revalidate([rolesQuery.key, membershipsQuery.key, invitesQuery.key]);
      onRevalidated();
    });
  };

  return (
    <SettingsSection label="Roles & permissions">
      <Setting
        label="Roles"
        description="Control what workspace members can see and manage"
        fade={false}
      >
        <Show when={canManage()}>
          <IconButton
            label={() => <span class="px-1">Create role</span>}
            class="flex-row-reverse pr-1"
            onClick={() => navigate(`/${params.workspaceID || ""}/settings/role`)}
            iconProps={{ class: "h-4 w-4" }}
            icon="i-lucide:plus"
            size="small"
            color="contrast"
            variant="outlined"
            text="soft"
          />
        </Show>
      </Setting>
      <div class="relative flex w-full flex-col">
        <Suspense
          fallback={
            <div class="flex flex-col">
              <div class="flex h-8 items-center gap-1 px-1">
                <Skeleton class={["h-6 w-6", "h-6 flex-1"]} />
              </div>
              <div class="flex h-8 items-center gap-1 px-1">
                <Skeleton class={["h-6 w-6", "h-6 flex-1"]} />
              </div>
            </div>
          }
        >
          <RoleList
            roles={roles() || []}
            members={members() || []}
            invites={invites() || []}
            canManage={canManage()}
            currentUserID={currentWorkspace()?.userID}
            refreshing={refreshing()}
            refresh={refresh}
          />
        </Suspense>
      </div>
    </SettingsSection>
  );
};

export { RolesSection };
