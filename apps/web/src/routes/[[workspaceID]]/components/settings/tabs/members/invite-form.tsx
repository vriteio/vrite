import { Button, Card, Input, Overlay } from "@andesine/components";
import { action, useAction, useSubmission } from "@solidjs/router";
import { Component, createMemo, createSignal, For, Show } from "solid-js";
import { client } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";

const inviteMemberAction = action((input: { email: string; roleID: string }) => {
  return client.memberships.invite(input);
});

interface InviteFormPageProps {
  goBack(): void;
  onInvited(): void;
  roles: Array<{ id: string; name: string }>;
}

const InviteFormPage: Component<InviteFormPageProps> = (props) => {
  const notify = useNotify();
  const inviteMember = useAction(inviteMemberAction);
  const inviteSubmission = useSubmission(inviteMemberAction);
  const [email, setEmail] = createSignal("");
  const [selectedRoleID, setSelectedRoleID] = createSignal(props.roles[0]?.id || "");
  const [inviteLink, setInviteLink] = createSignal<string | null>(null);
  const [inviteDelivery, setInviteDelivery] = createSignal<"sent" | "manual" | "failed">("sent");
  const [copied, setCopied] = createSignal(false);
  const loading = () => inviteSubmission.pending;

  const inviteLinkCopy = createMemo(() => {
    switch (inviteDelivery()) {
      case "manual":
        return {
          title: "Invite Link",
          description:
            "Email delivery is not configured, so share this link directly with the invitee."
        };
      case "failed":
        return {
          title: "Invite Link",
          description:
            "The invite was created, but the email could not be delivered. Share this link manually."
        };
      default:
        return {
          title: "Invite Link",
          description: "You can also share this link directly with the invitee."
        };
    }
  });

  const copyLink = async () => {
    const link = inviteLink();

    if (!link) return;

    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    const emailValue = email().trim();

    if (!emailValue) {
      notify({ type: "error", text: "Email address is required" });
      return;
    }

    if (!selectedRoleID()) {
      notify({ type: "error", text: "Please select a role" });
      return;
    }

    try {
      const data = await inviteMember({
        email: emailValue,
        roleID: selectedRoleID()
      });

      setInviteDelivery(data.emailDelivery);

      if (data.emailDelivery === "sent") {
        notify({ type: "success", text: "Invitation email sent" });
      } else if (data.emailDelivery === "manual") {
        notify({
          type: "success",
          text: "Invite created. Email delivery is not configured, so share the link manually."
        });
      } else {
        notify({
          type: "error",
          text: "Invite created, but the email could not be sent. Share the link manually."
        });
      }

      setInviteLink(data.inviteLink);
      props.onInvited();
    } catch (error) {
      notify({ type: "error", text: "Failed to create invitation" });
    }
  };

  return (
    <div class="flex flex-col gap-4 h-full">
      {/* ── Invite link reveal dialog ────────────────────────────────── */}
      <Show when={inviteLink()}>
        <Overlay
          opened={!!inviteLink()}
          ariaLabel="Invite link"
          onOverlayClick={() => {
            setInviteLink(null);
            props.goBack();
          }}
        >
          <Card class="flex flex-col gap-3 p-4 w-lg rounded-2xl" color="contrast">
            <div class="flex flex-col gap-1">
              <h3 class="text-lg font-semibold">{inviteLinkCopy().title}</h3>
              <p class="text-sm text-gray-400 dark:text-gray-500">{inviteLinkCopy().description}</p>
            </div>
            <Card class="rounded-xl p-3 font-mono text-sm break-all select-all" shade>
              {inviteLink()}
            </Card>
            <div class="flex justify-end gap-2">
              <Button
                variant="outlined"
                text="soft"
                size="small"
                onClick={() => {
                  setInviteLink(null);
                  props.goBack();
                }}
              >
                Close
              </Button>
              <Button color="primary" variant="solid" size="small" onClick={copyLink}>
                {copied() ? "Copied!" : "Copy link"}
              </Button>
            </div>
          </Card>
        </Overlay>
      </Show>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <div class="flex flex-col gap-5 flex-1">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium">Email address</label>
          <Input
            placeholder="colleague@example.com"
            value={email()}
            setValue={setEmail}
            class="w-full"
            onEnter={() => {
              void handleSubmit();
            }}
          />
        </div>

        {/* Role selector */}
        <div class="flex flex-col gap-2">
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-medium">Role</span>
            <span class="text-xs text-gray-400 dark:text-gray-500">
              Select the role to assign to the new member
            </span>
          </div>
          <div class="flex flex-col divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <For each={props.roles}>
              {(role) => {
                const active = () => selectedRoleID() === role.id;

                return (
                  <button
                    disabled={loading()}
                    class={`flex items-center justify-between gap-4 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors`}
                    onClick={() => setSelectedRoleID(role.id)}
                  >
                    <span class="text-sm font-medium">{role.name}</span>
                    <div
                      class={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        active() ? "border-primary-500" : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {active() && <div class="w-2 h-2 rounded-full bg-primary-500" />}
                    </div>
                  </button>
                );
              }}
            </For>
          </div>
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div class="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
        <Button
          variant="outlined"
          text="soft"
          size="small"
          onClick={props.goBack}
          disabled={loading()}
        >
          Cancel
        </Button>
        <Button
          color="primary"
          variant="solid"
          size="small"
          onClick={handleSubmit}
          disabled={loading()}
        >
          {loading() ? "Sending..." : "Send Invite"}
        </Button>
      </div>
    </div>
  );
};

export { InviteFormPage };
