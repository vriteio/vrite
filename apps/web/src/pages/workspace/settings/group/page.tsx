import {
  Button,
  Checkbox,
  Fragment,
  IconButton,
  Input,
  Skeleton,
  Tooltip
} from "@andesine/components";
import { createAsync, revalidate, useNavigate, useParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  Suspense
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { useNotify } from "#web/context/notifications";
import { client } from "#web/lib/api";
import { groupsQuery, invitesQuery, membershipsQuery, rolesQuery } from "#web/lib/data";
import type { InviteDetails, WorkspaceMember } from "../people/members-section/types";
import { Setting } from "../setting";
import { SettingsSection } from "../settings-section";

interface SaveGroupInput {
  id?: string;
  invitationIDs: string[];
  memberIDs: string[];
  name: string;
}

const isDuplicateGroupNameError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "GROUP_NAME_DUPLICATE"
  );
};
const toggleID = (ids: string[], id: string, selected: boolean): string[] => {
  return selected ? [...new Set([...ids, id])] : ids.filter((currentID) => currentID !== id);
};

const GroupSettingsPage: Component = () => {
  const notify = useNotify();
  const navigate = useNavigate();
  const params = useParams<{ groupID?: string; workspaceID?: string }>();
  const groupID = () => params.groupID || null;
  const navigateToPeople = () => navigate(`/${params.workspaceID || ""}/settings/people`);
  const groups = createAsync(
    async () => {
      try {
        return await groupsQuery();
      } catch (error) {
        console.error(error);

        return null;
      }
    },
    { deferStream: true }
  );
  const members = createAsync(() => membershipsQuery(), { deferStream: true });
  const invitations = createAsync(() => invitesQuery(), { deferStream: true });
  const roles = createAsync(() => rolesQuery(), { deferStream: true });
  const currentGroup = createMemo(() => {
    return groupID() ? groups()?.find((group) => group.id === groupID()) : null;
  });
  const [groupName, setGroupName] = createSignal("");
  const [groupNameServerError, setGroupNameServerError] = createSignal("");
  const [selectedInvitationIDs, setSelectedInvitationIDs] = createSignal<string[]>([]);
  const [selectedMemberIDs, setSelectedMemberIDs] = createSignal<string[]>([]);
  const groupNameError = createMemo(() => {
    const name = groupName().trim();

    if (!name) return "Group name is required";
    if (name.length > 50) return "Group name must be 50 characters or fewer";
    if (
      groups()?.some((group) => {
        return group.id !== groupID() && group.name.trim().toLowerCase() === name.toLowerCase();
      })
    ) {
      return "A group with this name already exists";
    }

    return groupNameServerError();
  });
  const fillError = createMemo(() => {
    if (groupID() && groups() && !currentGroup()) return "Group could not be found";
    if (groupNameError()) return groupNameError();

    return "";
  });
  const saveMutation = createMutation(() => ({
    mutationFn: async (input: SaveGroupInput) => {
      if (input.id) {
        await client.groups.update({
          id: input.id,
          invitationIDs: input.invitationIDs,
          memberIDs: input.memberIDs,
          name: input.name
        });
      }

      await client.groups.create({
        invitationIDs: input.invitationIDs,
        memberIDs: input.memberIDs,
        name: input.name
      });
    },
    onSuccess: async () => {
      await revalidate(groupsQuery.key);
      notify({ type: "success", text: groupID() ? "Group updated" : "Group created" });
      navigateToPeople();
    },
    onError: (error) => {
      console.error(error);
      if (isDuplicateGroupNameError(error)) {
        setGroupNameServerError("A group with this name already exists");
      }
      void revalidate(groupsQuery.key);
      notify({ type: "error", text: "Failed to save group" });
    }
  }));
  const memberList = () => (members() || []) as WorkspaceMember[];
  const invitationList = () => (invitations() || []) as InviteDetails[];
  const roleName = (roleID: string) => {
    return roles()?.find((role) => role.id === roleID)?.name || "Unknown role";
  };

  createEffect(() => {
    const availableGroups = groups();
    const group = currentGroup();

    if (groupID() && availableGroups !== undefined && !group) {
      notify({
        type: "error",
        text: availableGroups === null ? "Group is unavailable" : "Group not found"
      });
      navigateToPeople();

      return;
    }

    if (group) {
      setGroupName(group.name);
      setSelectedInvitationIDs([...group.invitationIDs]);
      setSelectedMemberIDs([...group.memberIDs]);
    }
  });

  return (
    <div class="flex min-w-0 flex-col">
      <SettingsSection label="Group details">
        <Setting
          label="Name"
          description="A clear name workspace members will recognize"
          fade={false}
        >
          <Input
            maxlength={50}
            placeholder="Editors"
            variant="outlined"
            color="contrast"
            size="small"
            value={groupName()}
            setValue={(name) => {
              setGroupName(name);
              setGroupNameServerError("");
            }}
            disabled={saveMutation.isPending}
            class="min-w-0"
            slotWrapperClass="w-full max-w-md"
            slot={() => (
              <Show when={groupNameError()}>
                {(error) => (
                  <div class="absolute right-2">
                    <Tooltip content={error()} placement="top">
                      <div
                        class="i-lucide:triangle-alert h-4.5 w-4.5 text-red-500"
                        title={error()}
                        aria-label={error()}
                        tabindex="0"
                      />
                    </Tooltip>
                  </div>
                )}
              </Show>
            )}
          />
        </Setting>
      </SettingsSection>
      <SettingsSection label="Members">
        <Suspense
          fallback={
            <>
              <Skeleton class="h-14 w-full rounded-lg" />
              <Skeleton class="h-14 w-full rounded-lg" />
            </>
          }
        >
          <For
            each={memberList()}
            fallback={
              <Setting
                label="No workspace members"
                description="Invite members before adding them to a group"
                fade={false}
              />
            }
          >
            {(member) => {
              const name = () => member.profile.name || member.profile.email;

              return (
                <label class="contents cursor-pointer">
                  <Setting
                    label={
                      <span class="flex min-w-0 items-center gap-1.5">
                        <span class="min-w-0 truncate">{name()}</span>
                        <span class="shrink-0 rounded-md bg-gray-100 border border-gray-200 px-1 py-px text-xs text-gray-500">
                          {roleName(member.roleID)}
                        </span>
                      </span>
                    }
                    description={
                      member.profile.email !== name() ? member.profile.email : "Workspace member"
                    }
                    fade={false}
                    hover
                  >
                    <Checkbox
                      checked={selectedMemberIDs().includes(member.id)}
                      disabled={saveMutation.isPending}
                      setChecked={(selected) => {
                        setSelectedMemberIDs((ids) => toggleID(ids, member.id, selected));
                      }}
                    />
                  </Setting>
                </label>
              );
            }}
          </For>
        </Suspense>
      </SettingsSection>
      <Show when={invitationList().length > 0}>
        <SettingsSection label="Pending invitations">
          <For each={invitationList()}>
            {(invitation) => (
              <Setting
                label={
                  <span class="flex min-w-0 items-center gap-1.5">
                    <span class="min-w-0 truncate">{invitation.email}</span>
                    <span class="shrink-0 rounded-md bg-gray-100 border border-gray-200 px-1 py-px text-xs text-gray-500">
                      {roleName(invitation.roleID)}
                    </span>
                  </span>
                }
                description="Will join this group when the invitation is accepted"
                fade={false}
                hover
              >
                <Checkbox
                  checked={selectedInvitationIDs().includes(invitation.id)}
                  disabled={saveMutation.isPending}
                  setChecked={(selected) => {
                    setSelectedInvitationIDs((ids) => toggleID(ids, invitation.id, selected));
                  }}
                />
              </Setting>
            )}
          </For>
        </SettingsSection>
      </Show>
      <div class="flex h-4 w-full items-center justify-center">
        <div class="h-px flex-1 bg-gray-200" />
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
            disabled={saveMutation.isPending}
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
            loading={saveMutation.isPending}
            onClick={() => {
              saveMutation.mutate({
                id: groupID() || undefined,
                invitationIDs: selectedInvitationIDs(),
                memberIDs: selectedMemberIDs(),
                name: groupName().trim()
              });
            }}
          >
            {groupID() ? "Save changes" : "Create group"}
          </Button>
        </Dynamic>
      </div>
    </div>
  );
};

export default GroupSettingsPage;
