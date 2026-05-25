import { Component, createEffect, createSignal, Show, Suspense } from "solid-js";
import { client, Permission } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";
import { Skeleton } from "@andesine/components";
import { InviteFormPage } from "../members/invite-form";
import { RoleFormPage } from "../roles/role-form";
import { action, useAction, useSubmission } from "@solidjs/router";
import { createMemo } from "solid-js";
import { MembersSection } from "./members-section";
import { RolesSection } from "./roles-section";

type BreadcrumbPart = string | { label: string; onClick: () => void };

interface SettingsTabProps {
  setTab(tabId: string): void;
  setBreadcrumb?(parts: BreadcrumbPart[]): void;
  canManageWorkspace?: boolean;
  opened?: boolean;
}

const updateMemberRoleAction = action(async (input: { memberIDs: string[]; roleID: string }) => {
  for (const memberID of input.memberIDs) {
    const [error] = await client.memberships.update({ id: memberID, roleID: input.roleID });

    if (error) throw error;
  }

  return input;
});
const removeMembersAction = action(async (input: { memberIDs: string[] }) => {
  for (const id of input.memberIDs) {
    const [error] = await client.memberships.remove({ id });

    if (error) throw error;
  }

  return input;
});
const revokeInvitesAction = action(async (input: { inviteIDs: string[] }) => {
  for (const id of input.inviteIDs) {
    const [error] = await client.memberships.revokeInvite({ id });

    if (error) throw error;
  }

  return input;
});

const PeopleSettingsTab: Component<SettingsTabProps> = (props) => {
  const notify = useNotify();
  const updateMemberRole = useAction(updateMemberRoleAction);
  const removeMembers = useAction(removeMembersAction);
  const revokeInvites = useAction(revokeInvitesAction);
  const updateRoleSubmission = useSubmission(updateMemberRoleAction);
  const removeMembersSubmission = useSubmission(removeMembersAction);
  const revokeInvitesSubmission = useSubmission(revokeInvitesAction);

  // ── Sub-page ──────────────────────────────────────────────────────────────
  type Page =
    | { id: "list" }
    | { id: "invite" }
    | { id: "create-role" }
    | { id: "edit-role"; roleId: string; name: string; permissions: Permission[] };
  const [page, setPage] = createSignal<Page>({ id: "list" });

  const memberMutationText = createMemo(() => {
    if (updateRoleSubmission.pending) {
      const count = updateRoleSubmission.input?.[0]?.memberIDs.length ?? 0;

      return count > 1 ? `Updating roles for ${count} members...` : "Updating member role...";
    }

    if (removeMembersSubmission.pending) {
      const count = removeMembersSubmission.input?.[0]?.memberIDs.length ?? 0;

      return count > 1 ? `Removing ${count} members...` : "Removing member...";
    }

    if (revokeInvitesSubmission.pending) {
      const count = revokeInvitesSubmission.input?.[0]?.inviteIDs.length ?? 0;

      return count > 1 ? `Revoking ${count} invitations...` : "Revoking invitation...";
    }

    return null;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpdateRole = async (memberIDs: string[], roleID: string) => {
    try {
      await updateMemberRole({ memberIDs, roleID });
      await syncMetadata("memberships");
      await syncMetadata("viewer");

      notify({
        type: "success",
        text:
          memberIDs.length > 1 ? `${memberIDs.length} member roles updated` : "Member role updated"
      });
    } catch (error) {
      notify({
        type: "error",
        text: "Failed to update member role"
      });
      await syncMetadata("memberships");
      await syncMetadata("viewer");
    }
  };

  const handleRemove = async (memberIDs: string[]) => {
    try {
      await removeMembers({ memberIDs });
      await syncMetadata("memberships");
      await syncMetadata("viewer");

      notify({
        type: "success",
        text: memberIDs.length > 1 ? `${memberIDs.length} members removed` : "Member removed"
      });
    } catch (error) {
      notify({ type: "error", text: "Failed to remove member" });
      await syncMetadata("memberships");
      await syncMetadata("viewer");
    }
  };

  const handleRevokeInvite = async (inviteIDs: string[]) => {
    try {
      await revokeInvites({ inviteIDs });
      await syncMetadata("invites");

      notify({
        type: "success",
        text:
          inviteIDs.length > 1 ? `${inviteIDs.length} invitations revoked` : "Invitation revoked"
      });
    } catch (error) {
      notify({
        type: "error",
        text: "Failed to revoke invitation"
      });
      await syncMetadata("invites");
    }
  };

  // ── Navigation & breadcrumb ───────────────────────────────────────────────
  const goToList = () => setPage({ id: "list" });

  createEffect(() => {
    const currentPage = page();

    if (
      !props.canManageWorkspace &&
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
    <div class="flex h-full min-w-0 flex-col gap-3 overflow-x-hidden">
      {/* ── Sub-page: Invite ──────────────────────────────────────────── */}
      <Show when={page().id === "invite"}>
        <InviteFormPage
          goBack={goToList}
          onInvited={() => syncMetadata("invites")}
          roles={roles().map((r) => ({ id: r.id, name: r.name }))}
        />
      </Show>

      {/* ── Sub-page: Create Role ─────────────────────────────────────── */}
      <Show when={page().id === "create-role"}>
        <RoleFormPage mode="create" goBack={goToList} onCreated={() => syncMetadata("roles")} />
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
                await syncMetadata("roles");
                await syncMetadata("memberships");
                await syncMetadata("viewer");
              }}
            />
          );
        })()}
      </Show>

      {/* ── Sub-page: List ────────────────────────────────────────────── */}
      <Show when={page().id === "list"}>
        <div class="flex flex-col gap-3">
          <Suspense fallback={<Skeleton class={["h-7", "h-7", "h-7"]} />}>
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
            />
          </Suspense>
          <Suspense fallback={<Skeleton class={["h-7", "h-7", "h-7"]} />}>
            <RolesSection
              roles={roles().map((role) => ({
                id: role.id,
                name: role.name,
                baseRole: role.baseRole,
                permissions: role.permissions
              }))}
              canManageRoles={props.canManageWorkspace ?? false}
              onCreateRole={() => setPage({ id: "create-role" })}
              onRolesChanged={async () => {
                await syncMetadata("roles");
                await syncMetadata("memberships");
                await syncMetadata("viewer");
              }}
              onEditRole={(role) =>
                setPage({
                  id: "edit-role",
                  roleId: role.id,
                  name: role.name,
                  permissions: role.permissions
                })
              }
            />
          </Suspense>
        </div>
      </Show>
    </div>
  );
};

export { PeopleSettingsTab };
