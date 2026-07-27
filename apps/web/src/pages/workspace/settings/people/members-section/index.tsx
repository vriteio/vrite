import { Card, IconButton, Skeleton } from "@andesine/components";
import { createAsync, query, revalidate, useNavigate, useParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { Component, createMemo, Show, Suspense, useTransition } from "solid-js";

import { Tree, TREE_ROOT_ID, type TreeMap } from "#web/components/tree";
import { useNotify } from "#web/context/notifications";
import { client, Membership, Role, UserProfile, Invite } from "#web/lib/client";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { InviteItem } from "./invite-item";
import { MemberItem } from "./member-item";

interface WorkspaceMember extends Membership {
  profile: UserProfile;
  admin?: boolean;
}
interface InviteDetails extends Invite {
  inviteLink: string;
  workspaceID: string;
}

interface WorkspaceMemberListProps {
  members: WorkspaceMember[];
  membersRefreshing?: boolean;
  refreshMembers(onRevalidated?: () => void): void;
  roles: Role[];
}

interface InviteListProps {
  invites: InviteDetails[];
  invitesRefreshing?: boolean;
  refreshInvites(onRevalidated?: () => void): void;
  roles: Role[];
}

interface InvitationSubsectionProps {
  invites: InviteDetails[];
  roles: Role[];
}

const membershipsQuery = query(() => client.memberships.list(), "memberships");
const invitesQuery = query(() => client.memberships.listInvites(), "invites");
const rolesQuery = query(() => client.roles.list(), "roles");

const ListSkeleton: Component = () => {
  return (
    <div class="flex flex-col">
      <div class="flex h-8 items-center gap-1 px-1">
        <Skeleton class={["h-6 w-6", "h-6 flex-1"]} />
      </div>
      <div class="flex h-8 items-center gap-1 px-1">
        <Skeleton class={["h-6 w-6", "h-6 flex-1"]} />
      </div>
    </div>
  );
};

const WorkspaceMemberList: Component<WorkspaceMemberListProps> = (props) => {
  const notify = useNotify();
  const updateRoleMutation = createMutation(() => ({
    mutationFn: ({ ids, roleID }: { ids: string[]; roleID: string }) => {
      return Promise.all(ids.map((id) => client.memberships.update({ id, roleID })));
    },
    onSuccess: () => {
      props.refreshMembers(() => updateRoleMutation.reset());
    },
    onError: (error) => {
      console.error(error);
      notify({ type: "error", text: error.message || "Failed to update member role" });
    }
  }));
  const removeMutation = createMutation(() => ({
    mutationFn: ({ ids }: { ids: string[] }) => {
      return Promise.all(ids.map((id) => client.memberships.remove({ id })));
    },
    onSuccess: () => {
      props.refreshMembers(() => removeMutation.reset());
    },
    onError: (error) => {
      console.error(error);
      notify({ type: "error", text: error.message || "Failed to remove member" });
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
    [TREE_ROOT_ID]: { items: optimisticMembers().map((member) => member.id), levels: [] }
  }));

  return (
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
        itemHeight={32}
        renderItem={(itemID) => {
          const member = () => optimisticMembers().find((current) => current.id === itemID)!;

          return (
            <MemberItem
              member={member()}
              roles={props.roles}
              loading={member().optimistic}
              onUpdateRole={(roleID, ids) => updateRoleMutation.mutate({ ids, roleID })}
              onRemove={(ids) => removeMutation.mutate({ ids })}
            />
          );
        }}
      />
    </Show>
  );
};

const InviteList: Component<InviteListProps> = (props) => {
  const notify = useNotify();
  const copyInviteLink = (link: string) => {
    navigator.clipboard.writeText(link);
    notify({ type: "success", text: "Invite link copied to clipboard" });
  };
  const resendMutation = createMutation(() => ({
    mutationFn: ({ ids }: { ids: string[] }) => {
      return Promise.all(ids.map((id) => client.memberships.resendInvite({ id })));
    },
    onSuccess: (results) => {
      props.refreshInvites(() => resendMutation.reset());
      const emailsSent = results.filter((result) => result.emailDelivery === "sent").length;
      const emailsManual = results.filter((result) => result.emailDelivery === "manual").length;
      const emailsFailed = results.filter((result) => result.emailDelivery === "failed").length;

      if (emailsSent > 0) {
        notify({
          type: "success",
          text: emailsSent > 1 ? `${emailsSent} invitations resent` : "Invitation resent"
        });
      }

      if (emailsManual > 0) {
        notify({
          type: "info",
          text:
            emailsManual > 1
              ? `${emailsManual} invitations require manual sending`
              : "Invitation requires manual sending"
        });
      }

      if (emailsFailed > 0) {
        notify({
          type: "error",
          text:
            emailsFailed > 1
              ? `${emailsFailed} invitations failed to resend`
              : "Invitation failed to resend"
        });
      }
    },
    onError: (error, { ids }) => {
      console.error(error);
      notify({
        type: "error",
        text: `Failed to resend invitation${ids.length > 1 ? "s" : ""}`
      });
    }
  }));
  const revokeMutation = createMutation(() => ({
    mutationFn: function ({ ids }: { ids: string[] }) {
      return Promise.all(ids.map((id) => client.memberships.revokeInvite({ id })));
    },
    onSuccess: (_, { ids }) => {
      props.refreshInvites(() => revokeMutation.reset());
      notify({
        type: "success",
        text: ids.length > 1 ? `${ids.length} invitations revoked` : "Invitation revoked"
      });
    },
    onError: (error) => {
      console.error(error);
      props.refreshInvites();
      notify({ type: "error", text: "Failed to revoke invitation" });
    }
  }));
  const optimisticInvites = createMemo<Array<InviteDetails & { optimistic?: boolean }>>(() => {
    if ((revokeMutation.isPending || props.invitesRefreshing) && revokeMutation.variables) {
      return props.invites.filter((invite) => !revokeMutation.variables!.ids.includes(invite.id));
    }

    if ((resendMutation.isPending || props.invitesRefreshing) && resendMutation.variables) {
      return props.invites.map((invite) => {
        if (resendMutation.variables!.ids.includes(invite.id)) {
          return { ...invite, optimistic: true };
        }

        return invite;
      });
    }

    return props.invites;
  });
  const invitesTree = createMemo<TreeMap>(() => ({
    [TREE_ROOT_ID]: { items: optimisticInvites().map((invite) => invite.id), levels: [] }
  }));

  return (
    <Show
      when={optimisticInvites().length}
      fallback={
        <Card
          class="flex h-16 items-center justify-center gap-1 rounded-lg bg-white px-2 text-sm text-gray-400"
          shade
        >
          <div class="i-lucide:mail h-5.5 w-5.5 text-gray-300" />
          No pending invitations
        </Card>
      }
    >
      <Tree
        tree={invitesTree}
        itemHeight={32}
        renderItem={(itemID) => {
          const invite = () => optimisticInvites().find((current) => current.id === itemID)!;

          return (
            <InviteItem
              invite={invite()}
              roles={props.roles}
              loading={invite().optimistic}
              onCopyLink={(link) => copyInviteLink(link)}
              onRevoke={(ids) => revokeMutation.mutate({ ids })}
              onResend={(ids) => resendMutation.mutate({ ids })}
            />
          );
        }}
      />
    </Show>
  );
};

const InvitationsSubsection: Component<InvitationSubsectionProps> = (props) => {
  const [invitesRefreshing, startInvitesRefresh] = useTransition();
  const showInvites = createMemo((visible) => visible || props.invites?.length || 0 > 0, false);
  const refreshInvites = (onRevalidated = () => {}) => {
    startInvitesRefresh(async () => {
      await revalidate(invitesQuery.key);
      onRevalidated();
    });
  };
  return (
    <Show when={showInvites()}>
      <Setting
        label="Invitations"
        description="Invitations remain here until they are accepted or revoked"
        fade={false}
      />
      <div class="relative flex w-full flex-col">
        <Suspense fallback={<ListSkeleton />}>
          <InviteList
            invites={props.invites || []}
            roles={props.roles || []}
            invitesRefreshing={invitesRefreshing()}
            refreshInvites={refreshInvites}
          />
        </Suspense>
      </div>
    </Show>
  );
};

const MembersSection: Component = () => {
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string }>();
  const members = createAsync(() => membershipsQuery());
  const invites = createAsync(() => invitesQuery());
  const roles = createAsync(() => rolesQuery());
  const [membersRefreshing, startMembersRefresh] = useTransition();
  const refreshMembers = (onRevalidated = () => {}) => {
    startMembersRefresh(async () => {
      await revalidate(membershipsQuery.key);
      onRevalidated();
    });
  };

  return (
    <SettingsSection label="Members">
      <div class="flex flex-col">
        <Setting
          label="Workspace members"
          description="Manage people who have access to this workspace"
          fade={false}
        >
          <IconButton
            label={() => <span class="px-1">Invite member</span>}
            class="flex-row-reverse pr-1"
            onClick={() => navigate(`/${params.workspaceID || ""}/settings/invite`)}
            iconProps={{ class: "h-4 w-4" }}
            icon="i-lucide:plus"
            size="small"
            color="contrast"
            variant="outlined"
            text="soft"
          />
        </Setting>
        <div class="relative flex w-full flex-col">
          <Suspense fallback={<ListSkeleton />}>
            <WorkspaceMemberList
              members={members() || []}
              roles={roles() || []}
              membersRefreshing={membersRefreshing()}
              refreshMembers={refreshMembers}
            />
          </Suspense>
        </div>
        <Suspense>
          <InvitationsSubsection invites={invites() || []} roles={roles() || []} />
        </Suspense>
      </div>
    </SettingsSection>
  );
};

export { MembersSection };
