import {
  mdiAccountCircle,
  mdiAccountMultiple,
  mdiAccountPlusOutline,
  mdiAccountRemove,
  mdiClock,
  mdiLogout
} from "@mdi/js";
import { Component, For, Show, createMemo } from "solid-js";
import clsx from "clsx";
import { CollapsibleSection } from "#components/fragments";
import {
  Button,
  Select,
  IconButton,
  Loader,
  Card,
  Heading,
  Tooltip,
  Icon
} from "#components/primitives";
import {
  App,
  hasPermission,
  useAuthenticatedUserData,
  useClient,
  useConfirmationModal,
  useNotifications
} from "#context";

type WorkspaceMemberData = App.WorkspaceMembership & {
  pendingInvite: boolean;
  profile?: Partial<{ fullName: string; avatar: string; username: string }>;
};

interface MemberDetailsProps {
  roles: App.Role[];
  member: WorkspaceMemberData;
}
interface MembersCardProps {
  roles: App.Role[];
  members: WorkspaceMemberData[];
  moreToLoad: boolean;
  rolesLoading: boolean;
  membersLoading: boolean;
  openInviteMemberSubsection(): void;
  loadMore(): void;
}

const MemberDetails: Component<MemberDetailsProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const { profile } = useAuthenticatedUserData();
  const { confirmAction: confirmDanger } = useConfirmationModal();
  const handleRoleChange = async (roleId: string): Promise<void> => {
    try {
      await client.workspaceMemberships.update.mutate({
        id: props.member.id,
        roleId
      });
      notify({ type: "success", text: "Role changed successfully" });
    } catch (error) {
      const clientError = error as App.ClientError;

      if (clientError.data.cause?.code === "notAllowed") {
        notify({ type: "error", text: "At least one Admin has to remain in the workspace" });
      }
    }
  };
  const isUser = createMemo(() => {
    return props.member.userId === profile()?.id;
  });

  return (
    <Card class="flex flex-col justify-center items-center w-full m-0 gap-2 @md:(flex-row items-start)">
      <div class="w-full flex justify-center items-start">
        <Show
          when={!props.member.pendingInvite && props.member.profile?.avatar}
          fallback={
            <div class="relative">
              <Icon path={mdiAccountCircle} class="h-12 w-12 mr-3" />
              <Show when={props.member.pendingInvite}>
                <div class="absolute -bottom-1 -left-1">
                  <Tooltip text="Pending invite" class="mt-1">
                    <IconButton
                      path={mdiClock}
                      class="m-0"
                      badge
                      color="primary"
                      text="base"
                      size="small"
                      variant="text"
                    />
                  </Tooltip>
                </div>
              </Show>
            </div>
          }
        >
          <img src={props.member.profile?.avatar} class="h-12 w-12 mr-3" />
        </Show>
        <div
          class={clsx(
            "flex flex-col flex-1 text-gray-700 dark:text-inherit items-start",
            !props.member.profile?.fullName && "h-12 justify-center"
          )}
        >
          <Show
            when={!props.member.pendingInvite}
            fallback={
              <>
                <Heading level={3}>{props.member.name || ""}</Heading>
                <p class="text-sm leading-none text-gray-500 dark:text-gray-400 break-anywhere">
                  {props.member.email || ""}
                </p>
              </>
            }
          >
            <Heading level={3}>
              {props.member.profile?.fullName || `@${props.member.profile?.username}`}
            </Heading>
            <Show when={props.member.profile?.fullName}>
              <p class="text-sm leading-none text-gray-500 dark:text-gray-400 break-anywhere">
                @{props.member.profile?.username}
              </p>
            </Show>
          </Show>
        </div>
      </div>
      <div class="flex gap-2 w-full justify-end items-center @md:w-auto">
        <Select
          options={props.roles.map((role) => ({
            label: role.name,
            value: role.id
          }))}
          color="contrast"
          wrapperClass="flex-1 @md:flex-[unset]"
          class="m-0 flex-1"
          disabled={!hasPermission("manageWorkspace")}
          value={props.member.roleId}
          setValue={(value) => {
            const role = props.roles.find((role) => role.id === value);

            if (
              profile()?.id === props.member.userId &&
              !role?.permissions.includes("manageWorkspace")
            ) {
              confirmDanger({
                header: "Change role",
                content: (
                  <p>
                    Do you really want to change your role in the workspace? You'll loose the
                    permission to manage the workspace.
                  </p>
                ),
                onConfirm() {
                  handleRoleChange(value);
                }
              });
            } else {
              handleRoleChange(value);
            }
          }}
        />
        <Show when={isUser() || hasPermission("manageWorkspace")}>
          <Tooltip text={isUser() ? "Leave" : "Remove"} class="mt-1">
            <IconButton
              path={isUser() ? mdiLogout : mdiAccountRemove}
              text="soft"
              class="m-0"
              color="contrast"
              onClick={() => {
                confirmDanger({
                  header: isUser() ? "Leave workspace" : "Remove member",
                  content: (
                    <Show
                      when={!isUser()}
                      fallback={<p>Do you really want to leave this workspace?</p>}
                    >
                      <p>
                        Do you really want to remove this member (
                        <b>
                          {props.member.profile?.fullName ||
                            props.member.profile?.username ||
                            props.member.name}
                        </b>
                        ) from the workspace?
                      </p>
                    </Show>
                  ),
                  async onConfirm() {
                    try {
                      let text = "Member removed from the workspace";

                      if (isUser()) {
                        text = "You left the workspace";
                        await client.workspaceMemberships.leave.mutate();
                      } else {
                        await client.workspaceMemberships.delete.mutate({
                          id: props.member.id
                        });
                      }

                      notify({
                        type: "success",
                        text
                      });
                    } catch (error) {
                      const clientError = error as App.ClientError;

                      if (clientError.data.cause?.code === "notAllowed") {
                        notify({
                          type: "error",
                          text: "At least one Admin has to remain in the workspace"
                        });
                      }
                    }
                  }
                });
              }}
            />
          </Tooltip>
        </Show>
      </div>
    </Card>
  );
};
const MembersCard: Component<MembersCardProps> = (props) => {
  return (
    <CollapsibleSection
      icon={mdiAccountMultiple}
      label="Members"
      action={
        <Show when={hasPermission("manageWorkspace")}>
          <Tooltip text="Invite member" wrapperClass="flex @md:hidden" class="mt-1" fixed>
            <IconButton
              path={mdiAccountPlusOutline}
              class="m-0"
              color="primary"
              onClick={props.openInviteMemberSubsection}
            />
          </Tooltip>
          <Button
            color="primary"
            class="m-0 hidden @md:flex"
            onClick={props.openInviteMemberSubsection}
          >
            Invite member
          </Button>
        </Show>
      }
    >
      <Show
        when={props.members.length || !props.membersLoading}
        fallback={
          <div class="flex justify-center items-center w-full">
            <Loader />
          </div>
        }
      >
        <For each={props.members} fallback={<p class="px-2 w-full text-start">No members found</p>}>
          {(member) => {
            return <MemberDetails member={member} roles={props.roles} />;
          }}
        </For>
        <Show when={props.moreToLoad}>
          <Button
            class="m-0 w-full"
            text="soft"
            loading={props.membersLoading}
            onClick={() => {
              props.loadMore();
            }}
          >
            Load more
          </Button>
        </Show>
      </Show>
    </CollapsibleSection>
  );
};

export { MembersCard };
export type { WorkspaceMemberData };
