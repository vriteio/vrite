import { Card } from "@andesine/components";
import { createMutation } from "@tanstack/solid-query";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { Tree, TREE_ROOT_ID, type TreeMap } from "#web/components/tree";
import { useNotify } from "#web/context/notifications";
import { settleBulkAction } from "#web/lib/primitives";
import { client } from "#web/lib/api";
import { ActionConfirmationDialog, type AffectedItem } from "../action-confirmation-dialog";
import { MemberItem } from "./member-item";
import type { WorkspaceMember, WorkspaceMemberListProps } from "./types";

const WorkspaceMemberList: Component<WorkspaceMemberListProps> = (props) => {
  const notify = useNotify();
  const [pendingAction, setPendingAction] = createSignal<
    | { ids: string[]; type: "remove" }
    | { ids: string[]; roleID: string; type: "update-role" }
    | null
  >(null);
  const updateRoleMutation = createMutation(() => ({
    mutationFn: ({ ids, roleID }: { ids: string[]; roleID: string }) => {
      return settleBulkAction(ids, (id) => client.memberships.update({ id, roleID }));
    },
    onSuccess: (result) => {
      result.failed.forEach(({ error }) => console.error(error));
      props.refreshMembers(() => {
        updateRoleMutation.reset();

        if (result.successful.length > 0) {
          notify({
            type: "success",
            text:
              result.successful.length > 1
                ? `${result.successful.length} member roles updated`
                : "Member role updated"
          });
        }

        if (result.failed.length > 0) {
          notify({
            type: "error",
            text:
              result.failed.length > 1
                ? `${result.failed.length} member roles failed to update`
                : "Failed to update member role"
          });
        }
      });
    }
  }));
  const removeMutation = createMutation(() => ({
    mutationFn: ({ ids }: { ids: string[] }) => {
      return settleBulkAction(ids, (id) => client.memberships.remove({ id }));
    },
    onSuccess: (result) => {
      result.failed.forEach(({ error }) => console.error(error));
      props.refreshMembers(() => {
        removeMutation.reset();

        if (result.successful.length > 0) {
          notify({
            type: "success",
            text:
              result.successful.length > 1
                ? `${result.successful.length} members removed`
                : "Member removed"
          });
        }

        if (result.failed.length > 0) {
          notify({
            type: "error",
            text:
              result.failed.length > 1
                ? `${result.failed.length} members failed to remove`
                : "Failed to remove member"
          });
        }
      });
    }
  }));
  const optimisticMembers = createMemo<Array<WorkspaceMember & { optimistic?: boolean }>>(() => {
    if ((removeMutation.isPending || props.membersRefreshing) && removeMutation.variables) {
      return props.members.filter((member) => !removeMutation.variables!.ids.includes(member.id));
    }

    if ((updateRoleMutation.isPending || props.membersRefreshing) && updateRoleMutation.variables) {
      return props.members.map((member) => {
        if (updateRoleMutation.variables!.ids.includes(member.id)) {
          return { ...member, roleID: updateRoleMutation.variables!.roleID, optimistic: true };
        }

        return member;
      });
    }

    return props.members;
  });
  const membersTree = createMemo<TreeMap>(() => ({
    [TREE_ROOT_ID]: {
      items: optimisticMembers().map((member) => member.id),
      levels: []
    }
  }));
  const affectedMembers = createMemo(() => {
    const ids = pendingAction()?.ids || [];

    return props.members.filter((member) => ids.includes(member.id));
  });
  const affectedItems = createMemo<AffectedItem[]>(() => {
    return affectedMembers().map((member) => ({
      detail:
        member.profile.email !== (member.profile.name || member.profile.email)
          ? member.profile.email
          : undefined,
      id: member.id,
      label: member.profile.name || member.profile.email
    }));
  });
  const affectsCurrentUser = () => {
    return affectedMembers().some((member) => member.userID === props.currentUserID);
  };
  const pendingRole = () => {
    const action = pendingAction();

    return action?.type === "update-role"
      ? props.roles.find((role) => role.id === action.roleID)
      : undefined;
  };
  const confirmPendingAction = () => {
    const action = pendingAction();

    if (!action) return;

    setPendingAction(null);
    if (action.type === "remove") {
      removeMutation.mutate({ ids: action.ids });
    } else {
      updateRoleMutation.mutate({ ids: action.ids, roleID: action.roleID });
    }
  };

  return (
    <>
      <Show
        when={optimisticMembers().length}
        fallback={
          <Card
            class="flex h-16 items-center justify-center gap-1 rounded-lg bg-white px-2 text-sm text-gray-400"
            shade
          >
            <div class="i-lucide:users h-5.5 w-5.5 text-gray-300" />
            No workspace members
          </Card>
        }
      >
        <Tree
          tree={membersTree}
          itemHeight="2rem"
          renderItem={(itemID) => {
            const member = () => optimisticMembers().find((current) => current.id === itemID)!;

            return (
              <MemberItem
                member={member()}
                members={props.members}
                roles={props.roles}
                canManage={props.canManage}
                canManageRoles={props.canManageRoles}
                disabled={!member().admin && props.disabledNonAdmins}
                currentUser={member().userID === props.currentUserID}
                loading={member().optimistic}
                onUpdateRole={(roleID, ids) =>
                  setPendingAction({ ids, roleID, type: "update-role" })
                }
                onRemove={(ids) => setPendingAction({ ids, type: "remove" })}
              />
            );
          }}
        />
      </Show>
      <ActionConfirmationDialog
        opened={Boolean(pendingAction())}
        title={
          pendingAction()?.type === "remove"
            ? `Remove ${affectedItems().length === 1 ? "member" : `${affectedItems().length} members`}?`
            : `Assign ${pendingRole()?.name || "role"}?`
        }
        description={
          pendingAction()?.type === "remove"
            ? "These people will immediately lose access to the workspace."
            : `These people will receive the ${pendingRole()?.name || "selected"} role and its permissions.`
        }
        affected={affectedItems()}
        warning={
          affectsCurrentUser()
            ? pendingAction()?.type === "remove"
              ? "This includes you. You will immediately lose access to this workspace."
              : "This includes you. Your workspace access may change immediately."
            : undefined
        }
        confirmLabel={pendingAction()?.type === "remove" ? "Remove" : "Assign role"}
        confirmColor={pendingAction()?.type === "remove" ? "danger" : "primary"}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />
    </>
  );
};

export { WorkspaceMemberList };
