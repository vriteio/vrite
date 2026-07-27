import {
  Button,
  Fragment,
  IconButton,
  Input,
  Select,
  Skeleton,
  Tooltip
} from "@andesine/components";
import { createAsync, query, revalidate, useNavigate, useParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { Component, createEffect, createMemo, createSignal, Suspense } from "solid-js";
import { Dynamic } from "solid-js/web";

import { useNotify } from "#web/context/notifications";
import { client } from "#web/lib/client";
import { Setting } from "../setting";
import { SettingsSection } from "../settings-section";
import { NewInviteDialog } from "./new-invite-dialog";

const rolesQuery = query(() => client.roles.list(), "roles");

const InviteSettingsPage: Component = () => {
  const notify = useNotify();
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string }>();
  const navigateToPeople = () => navigate(`/${params.workspaceID || ""}/settings/people`);
  const roles = createAsync(() => rolesQuery(), { deferStream: true });
  const [email, setEmail] = createSignal("");
  const [selectedRoleID, setSelectedRoleID] = createSignal("");
  const [inviteLink, setInviteLink] = createSignal("");
  const [delivery, setDelivery] = createSignal<"sent" | "manual" | "failed">("sent");
  const roleOptions = createMemo(() => {
    return (roles() || []).map((role) => ({ label: role.name, value: role.id }));
  });
  const fillError = createMemo(() => {
    if (!email().trim()) return "Email address is required";
    if (!/^\S+@\S+\.\S+$/.test(email().trim())) return "Enter a valid email address";
    if (!selectedRoleID()) return "Select a role";

    return "";
  });
  const inviteMutation = createMutation(() => ({
    mutationFn: (input: { email: string; roleID: string }) => client.memberships.invite(input),
    onSuccess: async (data) => {
      setDelivery(data.emailDelivery);
      setInviteLink(data.inviteLink);
      await revalidate("people-invites");

      notify({
        type: data.emailDelivery === "failed" ? "error" : "success",
        text:
          data.emailDelivery === "sent"
            ? "Invitation email sent"
            : data.emailDelivery === "manual"
              ? "Invitation created — share the link manually"
              : "Invitation created, but its email could not be delivered"
      });
    },
    onError: (error) => {
      console.error(error);
      notify({
        type: "error",
        text:
          error instanceof Error && error.message ? error.message : "Failed to create invitation"
      });
    }
  }));

  createEffect(() => {
    const availableRoles = roles() || [];

    if (!availableRoles.some((role) => role.id === selectedRoleID())) {
      setSelectedRoleID(availableRoles[0]?.id || "");
    }
  });

  return (
    <>
      <NewInviteDialog
        link={inviteLink()}
        delivery={delivery()}
        onClose={() => {
          setInviteLink("");
          navigateToPeople();
        }}
      />
      <div class="flex min-w-0 flex-col">
        <SettingsSection label="Invitation details">
          <Setting
            label="Email address"
            description="The teammate who should receive this invite"
            fade={false}
          >
            <Input
              type="email"
              autocomplete="email"
              placeholder="colleague@example.com"
              variant="outlined"
              color="contrast"
              size="small"
              value={email()}
              setValue={setEmail}
              class="w-full max-w-md"
              onEnter={() => {
                if (!fillError()) {
                  inviteMutation.mutate({ email: email().trim(), roleID: selectedRoleID() });
                }
              }}
            />
          </Setting>
          <Suspense
            fallback={
              <Setting
                label="Role"
                description="Role assigned when the invitation is accepted"
                fade={false}
              >
                <Skeleton class="h-7 w-full max-w-md rounded-lg" />
              </Setting>
            }
          >
            <Setting
              label="Role"
              description="Role assigned when the invitation is accepted"
              fade={false}
            >
              <Select
                class="w-full max-w-md"
                disabled={inviteMutation.isPending || roleOptions().length === 0}
                options={roleOptions()}
                placeholder="Select a role"
                value={selectedRoleID()}
                setValue={setSelectedRoleID}
              />
            </Setting>
          </Suspense>
        </SettingsSection>
        <div class="flex h-4 w-full items-center justify-center">
          <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </div>
        <div class="flex items-center justify-end gap-2">
          <Tooltip content="Go back">
            <IconButton
              variant="outlined"
              color="contrast"
              text="soft"
              size="small"
              icon="i-lucide:chevron-left"
              onClick={navigateToPeople}
              disabled={inviteMutation.isPending}
            />
          </Tooltip>
          <Dynamic
            component={fillError() ? Tooltip : Fragment}
            content={fillError()}
            wrapperClass="flex-1"
          >
            <Button
              color="primary"
              variant="outlined"
              size="small"
              class="flex w-full items-center justify-center gap-1"
              disabled={Boolean(fillError())}
              loading={inviteMutation.isPending}
              onClick={() => {
                inviteMutation.mutate({ email: email().trim(), roleID: selectedRoleID() });
              }}
            >
              Send invitation
            </Button>
          </Dynamic>
        </div>
      </div>
    </>
  );
};

export default InviteSettingsPage;
