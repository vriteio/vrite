import { Card, IconButton, Skeleton } from "@andesine/components";
import { createAsync, revalidate, useNavigate, useParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { type Component, createMemo, createSignal, Show, Suspense, useTransition } from "solid-js";
import { Tree, TREE_ROOT_ID, type TreeMap } from "#web/components/tree";
import {
  ActionConfirmationDialog,
  type AffectedItem
} from "#web/components/action-confirmation-dialog";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/api";
import { groupsQuery, invitesQuery, membershipsQuery } from "#web/lib/data";
import { settleBulkAction } from "#web/lib/primitives";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import type { InviteDetails, WorkspaceMember } from "../members-section/types";
import { GroupItem } from "./group-item";

const GroupsSection: Component = () => {
  const { currentWorkspace, hasPermission } = useWorkspace();
  const notify = useNotify();
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string }>();
  const groups = createAsync(async () => {
    return currentWorkspace()?.subscriptionPlan === "pro" ? groupsQuery() : [];
  });
  const invitations = createAsync(async () => {
    return currentWorkspace()?.subscriptionPlan === "pro" ? invitesQuery() : [];
  });
  const members = createAsync(() => membershipsQuery());
  const [, startRefresh] = useTransition();
  const [pendingDeleteIDs, setPendingDeleteIDs] = createSignal<string[]>([]);
  const canManage = () => {
    return hasPermission("workspace") && currentWorkspace()?.subscriptionPlan === "pro";
  };
  const groupList = () => groups() || [];
  const memberList = () => (members() || []) as WorkspaceMember[];
  const invitationList = () => (invitations() || []) as InviteDetails[];
  const groupPath = (groupID = "") => {
    const suffix = groupID ? `/${encodeURIComponent(groupID)}` : "";

    return `/${params.workspaceID || ""}/settings/group${suffix}`;
  };
  const refresh = (onRevalidated = () => {}) => {
    void startRefresh(() => {
      void revalidate(groupsQuery.key).then(onRevalidated);
    });
  };
  const deleteMutation = createMutation(() => ({
    mutationFn: ({ ids }: { ids: string[] }) => {
      return settleBulkAction(ids, (id) => client.groups.delete({ id }));
    },
    onSuccess: (result) => {
      result.failed.forEach(({ error }) => console.error(error));
      setPendingDeleteIDs([]);
      refresh(() => {
        deleteMutation.reset();

        if (result.successful.length > 0) {
          notify({
            type: "success",
            text:
              result.successful.length > 1
                ? `${result.successful.length} groups deleted`
                : "Group deleted"
          });
        }

        if (result.failed.length > 0) {
          notify({
            type: "error",
            text:
              result.failed.length > 1
                ? `${result.failed.length} groups failed to delete`
                : "Failed to delete group"
          });
        }
      });
    },
    onError: (error) => {
      console.error(error);
      notify({ type: "error", text: "Failed to delete group" });
    }
  }));
  const visibleGroups = createMemo(() => {
    const deletedIDs =
      deleteMutation.isPending && deleteMutation.variables ? deleteMutation.variables.ids : [];

    return groupList().filter((group) => !deletedIDs.includes(group.id));
  });
  const groupsTree = createMemo<TreeMap>(() => ({
    [TREE_ROOT_ID]: {
      items: visibleGroups().map((group) => group.id),
      levels: []
    }
  }));
  const deletionTargets = createMemo(() => {
    return groupList().filter((group) => pendingDeleteIDs().includes(group.id));
  });
  const affectedItems = createMemo<AffectedItem[]>(() => {
    const targets = deletionTargets();

    if (targets.length === 0) return [];

    const memberIDs = new Set(targets.flatMap((group) => group.memberIDs));
    const invitationIDs = new Set(targets.flatMap((group) => group.invitationIDs));

    const affectedMembers = memberList()
      .filter((member) => memberIDs.has(member.id))
      .map((member) => ({
        id: member.id,
        label: member.profile.name || member.profile.email,
        detail: "Member — group access will be removed"
      }));
    const affectedInvitations = invitationList()
      .filter((invitation) => invitationIDs.has(invitation.id))
      .map((invitation) => ({
        id: invitation.id,
        icon: "i-lucide:mail",
        label: invitation.email,
        detail: "Pending invitation — group assignment will be removed"
      }));

    return [...affectedMembers, ...affectedInvitations];
  });

  return (
    <SettingsSection label="Groups">
      <ActionConfirmationDialog
        opened={pendingDeleteIDs().length > 0}
        title={`Delete ${deletionTargets().length === 1 ? deletionTargets()[0].name : `${deletionTargets().length} groups`}?`}
        description="The group’s restricted collection assignments will be removed. Workspace memberships are kept."
        affected={affectedItems()}
        action={{
          color: "danger",
          label: "Delete group",
          loading: deleteMutation.isPending,
          onClick: () => {
            const ids = pendingDeleteIDs();

            if (ids.length > 0) deleteMutation.mutate({ ids });
          }
        }}
        onClose={() => {
          if (!deleteMutation.isPending) setPendingDeleteIDs([]);
        }}
      />
      <Setting
        label="Workspace groups"
        description="Group members and assign roles at restricted collection boundaries"
        fade={false}
      >
        <Show when={canManage()}>
          <IconButton
            label={() => <span class="px-1">Create group</span>}
            class="flex-row-reverse pr-1"
            onClick={() => navigate(groupPath())}
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
        <Show
          when={currentWorkspace()?.subscriptionPlan === "pro"}
          fallback={
            <Card
              class="flex h-16 items-center justify-center gap-1 rounded-lg bg-white px-2 text-sm text-gray-400"
              shade
            >
              <div class="i-lucide:sparkles h-5.5 w-5.5 text-gray-300" />
              Groups require Andesine Pro
            </Card>
          }
        >
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
            <Show
              when={visibleGroups().length > 0}
              fallback={
                <Card
                  class="flex h-16 items-center justify-center gap-1 rounded-lg bg-white px-2 text-sm text-gray-400"
                  shade
                >
                  <div class="i-lucide:users h-5.5 w-5.5 text-gray-300" />
                  No workspace groups
                </Card>
              }
            >
              <Tree
                tree={groupsTree}
                itemHeight="2rem"
                renderItem={(itemID) => {
                  const group = () => visibleGroups().find((current) => current.id === itemID)!;

                  return (
                    <GroupItem
                      group={group()}
                      canManage={canManage()}
                      onEdit={() => navigate(groupPath(group().id))}
                      onDelete={setPendingDeleteIDs}
                    />
                  );
                }}
              />
            </Show>
          </Suspense>
        </Show>
      </div>
    </SettingsSection>
  );
};

export { GroupsSection };
