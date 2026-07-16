import { Button, Card, Input, Overlay } from "@andesine/components";
import { Component, createMemo, createSignal, For, Show } from "solid-js";
import { client } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";
import { createMutation } from "@tanstack/solid-query";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";

interface InviteFormPageProps {
  goBack(): void;
  onInvited(): Promise<void> | void;
  roles: Array<{ id: string; name: string }>;
}

const InviteFormPage: Component<InviteFormPageProps> = (props) => {
  const notify = useNotify();
  const inviteMemberMutation = createMutation(() => ({
    mutationFn: (input: { email: string; roleID: string }) => client.memberships.invite(input)
  }));
  const [email, setEmail] = createSignal("");
  const [selectedRoleID, setSelectedRoleID] = createSignal(props.roles[0]?.id || "");
  const [inviteLink, setInviteLink] = createSignal<string | null>(null);
  const [inviteDelivery, setInviteDelivery] = createSignal<"sent" | "manual" | "failed">("sent");
  const [copied, setCopied] = createSignal(false);
  const loading = () => inviteMemberMutation.isPending;

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
      const data = await inviteMemberMutation.mutateAsync({
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
      await props.onInvited();
    } catch (error) {
      notify({
        type: "error",
        text:
          error instanceof Error && error.message ? error.message : "Failed to create invitation"
      });
    }
  };

  return (
    <div class="flex min-w-0 flex-col">
      {/* ── Invite link reveal dialog ────────────────────────────────── */}
      <Show when={inviteLink()}>
        <Overlay
          opened={!!inviteLink()}
          aria-label="Invite link"
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

      <SettingsSection label="Invitation details">
        <Setting label="Email address" description="The teammate who should receive this invite">
          <Input
            placeholder="colleague@example.com"
            value={email()}
            setValue={setEmail}
            class="w-full max-w-md"
            onEnter={() => {
              handleSubmit();
            }}
          />
        </Setting>
      </SettingsSection>
      <SettingsSection label="Workspace access">
        <Setting label="Role" description="Select the role assigned when the invite is accepted">
          <div class="flex w-full flex-col gap-2">
            <Show
              when={props.roles.length}
              fallback={
                <Card class="rounded-lg text-gray-500 bg-white text-sm px-2 py-1.5" shade>
                  No roles are available for this invitation.
                </Card>
              }
            >
              <div class="flex flex-col divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
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
            </Show>
          </div>
        </Setting>
      </SettingsSection>

      <SettingsSection label="Actions">
        <Setting label="Send invitation" description="Create the invite and notify your teammate">
          <div class="flex w-full justify-end gap-2">
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
              {loading() ? "Sending..." : "Send invite"}
            </Button>
          </div>
        </Setting>
      </SettingsSection>
    </div>
  );
};

export { InviteFormPage };
