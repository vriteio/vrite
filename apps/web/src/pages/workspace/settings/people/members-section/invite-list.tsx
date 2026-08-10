import { Card } from "@andesine/components";
import { createMutation } from "@tanstack/solid-query";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { Tree, TREE_ROOT_ID, type TreeMap } from "#web/components/tree";
import { useClipboard } from "#web/context/clipboard";
import { useNotify } from "#web/context/notifications";
import { settleBulkAction } from "#web/lib/primitives";
import { client } from "#web/lib/api";
import { ActionConfirmationDialog, type AffectedItem } from "../action-confirmation-dialog";
import { InviteItem } from "./invite-item";
import type { InviteDetails, InviteListProps } from "./types";

const InviteList: Component<InviteListProps> = (props) => {
  const notify = useNotify();
  const { copyText } = useClipboard();
  const [pendingRevokeIDs, setPendingRevokeIDs] = createSignal<string[]>([]);
  const copyInviteLink = (link: string) => {
    void copyText(link, {
      success: "Invite link copied to clipboard",
      fallback: { title: "Copy invite link manually" }
    });
  };
  const resendMutation = createMutation(() => ({
    mutationFn: ({ ids }: { ids: string[] }) => {
      return settleBulkAction(ids, (id) => client.memberships.resendInvite({ id }));
    },
    onSuccess: (result) => {
      result.failed.forEach(({ error }) => console.error(error));
      props.refreshInvites(() => {
        resendMutation.reset();
        const deliveries = result.successful.map(({ value }) => value);
        const emailsSent = deliveries.filter(
          (delivery) => delivery.emailDelivery === "sent"
        ).length;
        const emailsManual = deliveries.filter(
          (delivery) => delivery.emailDelivery === "manual"
        ).length;
        const emailsFailed =
          deliveries.filter((delivery) => delivery.emailDelivery === "failed").length +
          result.failed.length;

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
      });
    }
  }));
  const revokeMutation = createMutation(() => ({
    mutationFn: function ({ ids }: { ids: string[] }) {
      return settleBulkAction(ids, (id) => client.memberships.revokeInvite({ id }));
    },
    onSuccess: (result) => {
      result.failed.forEach(({ error }) => console.error(error));
      props.refreshInvites(() => {
        revokeMutation.reset();

        if (result.successful.length > 0) {
          notify({
            type: "success",
            text:
              result.successful.length > 1
                ? `${result.successful.length} invitations revoked`
                : "Invitation revoked"
          });
        }

        if (result.failed.length > 0) {
          notify({
            type: "error",
            text:
              result.failed.length > 1
                ? `${result.failed.length} invitations failed to revoke`
                : "Failed to revoke invitation"
          });
        }
      });
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
    [TREE_ROOT_ID]: {
      items: optimisticInvites().map((invite) => invite.id),
      levels: []
    }
  }));
  const affectedInvites = createMemo<AffectedItem[]>(() => {
    return props.invites
      .filter((invite) => pendingRevokeIDs().includes(invite.id))
      .map((invite) => ({
        detail: "Pending invitation",
        icon: "i-lucide:mail",
        id: invite.id,
        label: invite.email
      }));
  });

  return (
    <>
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
          itemHeight="2rem"
          renderItem={(itemID) => {
            const invite = () => optimisticInvites().find((current) => current.id === itemID)!;

            return (
              <InviteItem
                invite={invite()}
                roles={props.roles}
                loading={invite().optimistic}
                onCopyLink={(link) => copyInviteLink(link)}
                onRevoke={setPendingRevokeIDs}
                onResend={(ids) => resendMutation.mutate({ ids })}
              />
            );
          }}
        />
      </Show>
      <ActionConfirmationDialog
        opened={pendingRevokeIDs().length > 0}
        title={`Revoke ${affectedInvites().length === 1 ? "invitation" : `${affectedInvites().length} invitations`}?`}
        description="These invite links will stop working immediately."
        affected={affectedInvites()}
        confirmLabel="Revoke"
        danger
        onClose={() => setPendingRevokeIDs([])}
        onConfirm={() => {
          const ids = pendingRevokeIDs();

          setPendingRevokeIDs([]);
          revokeMutation.mutate({ ids });
        }}
      />
    </>
  );
};

export { InviteList };
