import { ConfigureRoleSubsection } from "./configure-role-subsection";
import { InformationCard } from "./information-card";
import { MembersCard, WorkspaceMemberData } from "./members-card";
import { RolesCard } from "./roles-card";
import { InviteMemberSubsection } from "./invite-member-subsection";
import { SettingsSectionComponent } from "../view";
import { createStore } from "solid-js/store";
import {
  Accessor,
  Match,
  Show,
  Switch,
  createEffect,
  createResource,
  createSignal,
  onCleanup
} from "solid-js";
import { mdiAccountMultiple, mdiDotsVertical, mdiTagText, mdiTrashCan } from "@mdi/js";
import { useNavigate } from "@solidjs/router";
import { App, hasPermission, useClient, useConfirmationModal } from "#context";
import { Dropdown, IconButton } from "#components/primitives";
import { breakpoints } from "#lib/utils";

const useRoles = (): {
  roles: Accessor<Array<App.ExtendedRole<"baseType">>>;
  loading: Accessor<boolean>;
  moreToLoad: Accessor<boolean>;
  loadMore(): void;
} => {
  const client = useClient();
  const [loading, setLoading] = createSignal(false);
  const [moreToLoad, setMoreToLoad] = createSignal(true);
  const [state, setState] = createStore<{
    roles: Array<App.ExtendedRole<"baseType">>;
  }>({
    roles: []
  });
  const loadMore = (): void => {
    const lastId = state.roles[state.roles.length - 1]?.id;

    if (loading() || !moreToLoad()) return;

    setLoading(true);
    client.roles.list.query({ perPage: 20, lastId }).then((data) => {
      setLoading(false);
      setState("roles", (roles) => [...roles, ...data]);
      setMoreToLoad(data.length === 20);
    });
  };

  loadMore();

  const rolesChanges = client.roles.changes.subscribe(undefined, {
    onData({ action, data }) {
      switch (action) {
        case "create":
          setState("roles", (roles) => [data, ...roles]);
          break;
        case "update":
          setState("roles", (roles) => {
            return roles.map((role) => {
              if (role.id === data.id) {
                return { ...role, ...data };
              }

              return role;
            });
          });
          break;
        case "delete":
          setState("roles", (roles) => roles.filter((role) => role.id !== data.id));
          break;
      }
    }
  });

  onCleanup(() => {
    rolesChanges.unsubscribe();
  });

  return {
    roles: () => state.roles,
    loading,
    loadMore,
    moreToLoad
  };
};
const useMembers = (): {
  loading: Accessor<boolean>;
  moreToLoad: Accessor<boolean>;
  loadMore(): void;
  members(): WorkspaceMemberData[];
} => {
  const client = useClient();
  const [loading, setLoading] = createSignal(false);
  const [moreToLoad, setMoreToLoad] = createSignal(true);
  const [state, setState] = createStore<{
    members: WorkspaceMemberData[];
  }>({
    members: []
  });
  const loadMore = (): void => {
    const lastId = state.members[state.members.length - 1]?.id;

    if (loading() || !moreToLoad()) return;

    setLoading(true);
    client.workspaceMemberships.listMembers.query({ perPage: 20, lastId }).then((data) => {
      setLoading(false);
      setState("members", (members) => [...members, ...data]);
      setMoreToLoad(data.length === 20);
    });
  };

  loadMore();

  const membersChanges = client.workspaceMemberships.changes.subscribe(undefined, {
    onData({ action, data }) {
      const index = state.members.findIndex((member) => member.id === data.id);

      switch (action) {
        case "create":
          setState("members", (members) => [data, ...members]);
          break;
        case "update":
          if (index >= 0) {
            setState("members", index, data);
          }

          break;
        case "delete":
          setState("members", (members) => {
            return members.filter((webhook) => webhook.id !== data.id);
          });
          break;
      }
    }
  });

  onCleanup(() => {
    membersChanges.unsubscribe();
  });

  return { loadMore, loading, moreToLoad, members: () => state.members };
};
const useWorkspace = (): {
  workspace: Accessor<Omit<App.Workspace, "contentGroups"> | null>;
  loading(): boolean;
} => {
  const client = useClient();
  const [workspace, { mutate }] = createResource<Omit<App.Workspace, "contentGroups"> | null>(
    () => {
      return client.workspaces.get.query();
    },
    { initialValue: null }
  );
  const workspaceChanges = client.workspaces.changes.subscribe(undefined, {
    onData({ action, data }) {
      if (action === "update" && workspace()) {
        mutate((workspace) => ({ ...workspace!, ...data }));
      }
    }
  });

  onCleanup(() => {
    workspaceChanges.unsubscribe();
  });

  return { workspace, loading: () => workspace.loading };
};
const WorkspaceSection: SettingsSectionComponent = (props) => {
  const client = useClient();
  const navigate = useNavigate();
  const { confirmWithInput } = useConfirmationModal();
  const [openedSubsection, setOpenedSubsection] = createSignal<
    "none" | "invite-member" | "configure-role"
  >("none");
  const [editedRoleId, setEditedRoleId] = createSignal("");
  const [dropdownOpened, setDropdownOpened] = createSignal(false);
  const rolesData = useRoles();
  const workspaceData = useWorkspace();
  const membersData = useMembers();

  createEffect(() => {
    if (openedSubsection() === "none") {
      props.setActionComponent(() => {
        return (
          <Show when={hasPermission("manageWorkspace")}>
            <Dropdown
              overlay={!breakpoints.md()}
              opened={dropdownOpened()}
              setOpened={setDropdownOpened}
              placement="bottom-end"
              activatorButton={() => {
                return <IconButton path={mdiDotsVertical} variant="text" text="soft" class="m-0" />;
              }}
            >
              <IconButton
                path={mdiTrashCan}
                label="Delete"
                variant="text"
                color="danger"
                class="w-full m-0 justify-start"
                onClick={() => {
                  setDropdownOpened(false);
                  confirmWithInput({
                    header: "Delete workspace",
                    async onConfirm() {
                      await client.workspaces.delete.mutate();
                      navigate("/workspaces");
                    },
                    content: (
                      <p>
                        The entire workspace (<b>{workspaceData.workspace()?.name}</b>) will be
                        deleted, including all the content, metadata, members, etc.{" "}
                        <b class="text-red-500">Proceed with caution!</b>
                      </p>
                    ),
                    input: workspaceData.workspace()?.name || ""
                  });
                }}
              />
            </Dropdown>
          </Show>
        );
      });
    }
  });

  return (
    <Switch>
      <Match when={openedSubsection() === "none"}>
        <InformationCard
          workspace={workspaceData.workspace()}
          workspaceLoading={workspaceData.loading()}
        />
        <MembersCard
          roles={rolesData.roles()}
          members={membersData.members()}
          rolesLoading={rolesData.loading()}
          membersLoading={membersData.loading()}
          moreToLoad={membersData.moreToLoad()}
          loadMore={membersData.loadMore}
          openInviteMemberSubsection={() => {
            setOpenedSubsection("invite-member");
            props.setSubSection({
              label: "Invite member",
              icon: mdiAccountMultiple,
              goBack() {
                setOpenedSubsection("none");
              }
            });
          }}
        />
        <RolesCard
          roles={rolesData.roles()}
          rolesLoading={rolesData.loading()}
          moreToLoad={rolesData.moreToLoad()}
          loadMore={rolesData.loadMore}
          editedRoleId={editedRoleId()}
          setEditedRoleId={setEditedRoleId}
          openConfigureRoleSubsection={() => {
            setOpenedSubsection("configure-role");
            props.setSubSection({
              label: editedRoleId() ? "Edit role" : "New role",
              icon: mdiTagText,
              goBack() {
                setOpenedSubsection("none");
              }
            });
          }}
        />
      </Match>
      <Match when={openedSubsection() === "configure-role"}>
        <ConfigureRoleSubsection
          setActionComponent={props.setActionComponent}
          editedRoleId={editedRoleId()}
          onRoleConfigured={() => {
            setOpenedSubsection("none");
          }}
        />
      </Match>
      <Match when={openedSubsection() === "invite-member"}>
        <InviteMemberSubsection
          setActionComponent={props.setActionComponent}
          roles={rolesData.roles()}
          rolesLoading={rolesData.loading()}
          onMemberInvited={() => {
            props.setActionComponent(null);
            setOpenedSubsection("none");
          }}
        />
      </Match>
    </Switch>
  );
};

export { WorkspaceSection };
