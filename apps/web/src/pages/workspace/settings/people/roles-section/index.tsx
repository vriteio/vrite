import { Card, IconButton, Skeleton } from "@andesine/components";
import { createAsync, query, revalidate, useNavigate, useParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { Component, createMemo, Show, Suspense, useTransition } from "solid-js";

import { Tree, TREE_ROOT_ID, type TreeMap } from "#web/components/tree";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { client, Role } from "#web/lib/client";
import { hasPermission } from "#web/lib/permissions";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { RoleItem } from "./role-item";

interface RoleListProps {
  canManage: boolean;
  refreshing?: boolean;
  refresh(onRevalidated?: () => void): void;
  roles: Role[];
}

const membershipsQuery = query(() => client.memberships.list(), "memberships");
const rolesQuery = query(() => client.roles.list(), "roles");

const RoleList: Component<RoleListProps> = (props) => {
  const notify = useNotify();
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string }>();
  const settingsPath = () => `/${params.workspaceID || ""}/settings`;
  const deleteMutation = createMutation(() => ({
    mutationFn: ({ ids }: { ids: string[] }) => {
      return Promise.all(ids.map((id) => client.roles.delete({ id })));
    },
    onSuccess: () => {
      props.refresh(() => deleteMutation.reset());
    },
    onError: (error) => {
      console.error(error);
      notify({ type: "error", text: "Failed to delete role" });
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

  return (
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
              onDelete={(ids) => deleteMutation.mutate({ ids })}
            />
          );
        }}
      />
    </Show>
  );
};

const RolesSection: Component = () => {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string }>();
  const roles = createAsync(() => rolesQuery());
  const [refreshing, startRefresh] = useTransition();
  const canManage = () => {
    const workspace = currentWorkspace();

    return Boolean(workspace?.admin || hasPermission(workspace?.permissions || [], "workspace"));
  };
  const refresh = (onRevalidated = () => {}) => {
    startRefresh(async () => {
      await revalidate([rolesQuery.key, membershipsQuery.key]);
      onRevalidated();
    });
  };

  return (
    <SettingsSection label="Roles & permissions">
      <Setting label="Roles" description="Control what workspace members can see and manage">
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
            canManage={canManage()}
            refreshing={refreshing()}
            refresh={refresh}
          />
        </Suspense>
      </div>
    </SettingsSection>
  );
};

export { RolesSection };
