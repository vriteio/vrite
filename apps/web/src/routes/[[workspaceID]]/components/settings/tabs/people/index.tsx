import { Component, createEffect, createSignal, Show } from "solid-js";
import { client, Permission } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";
import { InviteFormPage } from "../members/invite-form";
import { RoleFormPage } from "../roles/role-form";
import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import { createMemo } from "solid-js";
import { MembersSection } from "./members-section";
import { RolesSection } from "./roles-section";
import { useWorkspace } from "#web/context/workspace";

type BreadcrumbPart = string | { label: string; onClick: () => void };

interface SettingsTabProps {
  setTab(tabId: string): void;
  setBreadcrumb?(parts: BreadcrumbPart[]): void;
  canManageWorkspace?: boolean;
  clientReady?: boolean;
  opened?: boolean;
}

const PeopleSettingsTab: Component<SettingsTabProps> = (props) => {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { workspaceID } = useWorkspace();
  const queryPrefix = () => ["settings", workspaceID(), "people"] as const;
  const rolesQuery = createQuery(() => ({
    queryKey: [...queryPrefix(), "roles"],
    enabled: Boolean(props.clientReady && workspaceID()),
    queryFn: () => client.roles.list()
  }));
  const membershipsQuery = createQuery(() => ({
    queryKey: [...queryPrefix(), "memberships"],
    enabled: Boolean(props.clientReady && workspaceID()),
    queryFn: () => client.memberships.list()
  }));
  const invitesQuery = createQuery(() => ({
    queryKey: [...queryPrefix(), "invites"],
    enabled: Boolean(props.clientReady && workspaceID()),
    queryFn: () => client.memberships.listInvites()
  }));
  const roles = () => rolesQuery.data ?? [];
  const memberships = () => membershipsQuery.data ?? [];
  const invites = () => invitesQuery.data ?? [];
  const invalidatePeople = async (...parts: Array<"roles" | "memberships" | "invites">) => {
    await Promise.all(
      parts.map((part) => queryClient.invalidateQueries({ queryKey: [...queryPrefix(), part] }))
    );
  };
  const getErrorText = (error: unknown, fallback: string) => {
    return error instanceof Error && error.message ? error.message : fallback;
  };
  const updateMemberRoleMutation = createMutation(() => ({
    mutationFn: async (input: { memberIDs: string[]; roleID: string }) => {
      for (const memberID of input.memberIDs) {
        await client.memberships.update({ id: memberID, roleID: input.roleID });
      }

      return input;
    }
  }));
  const removeMembersMutation = createMutation(() => ({
    mutationFn: async (input: { memberIDs: string[] }) => {
      for (const id of input.memberIDs) {
        await client.memberships.remove({ id });
      }

      return input;
    }
  }));
  const revokeInvitesMutation = createMutation(() => ({
    mutationFn: async (input: { inviteIDs: string[] }) => {
      for (const id of input.inviteIDs) {
        await client.memberships.revokeInvite({ id });
      }

      return input;
    }
  }));

  // ── Sub-page ──────────────────────────────────────────────────────────────
  type Page =
    | { id: "list" }
    | { id: "invite" }
    | { id: "create-role" }
    | { id: "edit-role"; roleId: string; name: string; permissions: Permission[] };
  const [page, setPage] = createSignal<Page>({ id: "list" });

  const memberMutationText = createMemo(() => {
    if (updateMemberRoleMutation.isPending) {
      const count = updateMemberRoleMutation.variables?.memberIDs.length ?? 0;

      return count > 1 ? `Updating roles for ${count} members...` : "Updating member role...";
    }

    if (removeMembersMutation.isPending) {
      const count = removeMembersMutation.variables?.memberIDs.length ?? 0;

      return count > 1 ? `Removing ${count} members...` : "Removing member...";
    }

    if (revokeInvitesMutation.isPending) {
      const count = revokeInvitesMutation.variables?.inviteIDs.length ?? 0;

      return count > 1 ? `Revoking ${count} invitations...` : "Revoking invitation...";
    }

    return null;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpdateRole = async (memberIDs: string[], roleID: string) => {
    try {
      await updateMemberRoleMutation.mutateAsync({ memberIDs, roleID });
      await invalidatePeople("memberships");

      notify({
        type: "success",
        text:
          memberIDs.length > 1 ? `${memberIDs.length} member roles updated` : "Member role updated"
      });
    } catch (error) {
      notify({
        type: "error",
        text: getErrorText(error, "Failed to update member role")
      });
      await invalidatePeople("memberships");
    }
  };

  const handleRemove = async (memberIDs: string[]) => {
    try {
      await removeMembersMutation.mutateAsync({ memberIDs });
      await invalidatePeople("memberships");

      notify({
        type: "success",
        text: memberIDs.length > 1 ? `${memberIDs.length} members removed` : "Member removed"
      });
    } catch (error) {
      notify({ type: "error", text: getErrorText(error, "Failed to remove member") });
      await invalidatePeople("memberships");
    }
  };

  const handleRevokeInvite = async (inviteIDs: string[]) => {
    try {
      await revokeInvitesMutation.mutateAsync({ inviteIDs });
      await invalidatePeople("invites");

      notify({
        type: "success",
        text:
          inviteIDs.length > 1 ? `${inviteIDs.length} invitations revoked` : "Invitation revoked"
      });
    } catch (error) {
      notify({
        type: "error",
        text: getErrorText(error, "Failed to revoke invitation")
      });
      await invalidatePeople("invites");
    }
  };

  // ── Navigation & breadcrumb ───────────────────────────────────────────────
  const goToList = () => setPage({ id: "list" });

  createEffect(() => {
    const currentPage = page();

    if (
      props.canManageWorkspace === false &&
      (currentPage.id === "create-role" || currentPage.id === "edit-role")
    ) {
      setPage({ id: "list" });
    }
  });

  createEffect(() => {
    const p = page();

    if (p.id === "list") {
      props.setBreadcrumb?.([]);
    } else if (p.id === "invite") {
      props.setBreadcrumb?.([{ label: "People", onClick: goToList }, "Members", "Invite"]);
    } else if (p.id === "create-role") {
      props.setBreadcrumb?.([{ label: "People", onClick: goToList }, "Roles", "New"]);
    } else if (p.id === "edit-role") {
      props.setBreadcrumb?.([{ label: "People", onClick: goToList }, "Roles", "Edit"]);
    }
  });

  return (
    <div class="flex h-full min-w-0 flex-col gap-3">
      {/* ── Sub-page: Invite ──────────────────────────────────────────── */}
      <Show when={page().id === "invite"}>
        <InviteFormPage
          goBack={goToList}
          onInvited={() => invalidatePeople("invites")}
          roles={roles().map((r) => ({ id: r.id, name: r.name }))}
        />
      </Show>

      {/* ── Sub-page: Create Role ─────────────────────────────────────── */}
      <Show when={page().id === "create-role"}>
        <RoleFormPage mode="create" goBack={goToList} onCreated={() => invalidatePeople("roles")} />
      </Show>

      {/* ── Sub-page: Edit Role ───────────────────────────────────────── */}
      <Show when={page().id === "edit-role"}>
        {(() => {
          const p = page() as Extract<Page, { id: "edit-role" }>;

          return (
            <RoleFormPage
              mode="edit"
              roleId={p.roleId}
              initialName={p.name}
              initialPermissions={p.permissions}
              goBack={goToList}
              onUpdated={async () => {
                await invalidatePeople("roles", "memberships");
              }}
            />
          );
        })()}
      </Show>

      {/* ── Sub-page: List ────────────────────────────────────────────── */}
      <Show when={page().id === "list"}>
        <div class="flex flex-col gap-3">
          <Show when={rolesQuery.error || membershipsQuery.error || invitesQuery.error}>
            <div class="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <span>Workspace people could not be loaded.</span>
              <button
                class="font-semibold hover:underline"
                onClick={() => invalidatePeople("roles", "memberships", "invites")}
              >
                Retry
              </button>
            </div>
          </Show>
          <MembersSection
            roles={roles().map((role) => ({ id: role.id, name: role.name }))}
            members={memberships().map((membership) => ({
              id: membership.id,
              profile: membership.profile,
              roleID: membership.roleID,
              admin: membership.admin
            }))}
            invites={invites().map((invite) => ({
              id: invite.id,
              email: invite.email,
              roleID: invite.roleID,
              createdAt: invite.createdAt
            }))}
            mutationText={memberMutationText()}
            onInvite={() => setPage({ id: "invite" })}
            onUpdateRole={handleUpdateRole}
            onRemove={handleRemove}
            onRevokeInvite={handleRevokeInvite}
            loading={
              membershipsQuery.isPending ||
              invitesQuery.isPending ||
              rolesQuery.isPending ||
              Boolean(membershipsQuery.error || invitesQuery.error || rolesQuery.error)
            }
          />
          <RolesSection
            roles={roles().map((role) => ({
              id: role.id,
              name: role.name,
              baseRole: role.baseRole,
              permissions: role.permissions
            }))}
            canManageRoles={props.canManageWorkspace ?? true}
            onCreateRole={() => setPage({ id: "create-role" })}
            onRolesChanged={async () => {
              await invalidatePeople("roles", "memberships");
            }}
            onEditRole={(role) =>
              setPage({
                id: "edit-role",
                roleId: role.id,
                name: role.name,
                permissions: role.permissions
              })
            }
            loading={rolesQuery.isPending || Boolean(rolesQuery.error)}
          />
        </div>
      </Show>
    </div>
  );
};

export { PeopleSettingsTab };
