import {
  Accessor,
  createContext,
  createEffect,
  createResource,
  createSignal,
  on,
  onCleanup,
  ParentComponent,
  Show,
  useContext
} from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { App, useClient } from "#context";

interface AuthenticatedUserDataContextValue {
  userSettings: Accessor<App.AppearanceSettings | null>;
  profile: Accessor<App.Profile | null>;
  membership: Accessor<App.WorkspaceMembership | null>;
  workspace: Accessor<Omit<App.Workspace, "contentGroups"> | null>;
  workspaceSettings: Accessor<App.WorkspaceSettings | null>;
  role: Accessor<App.ExtendedRole<"baseType"> | null>;
  deletedTags: Accessor<string[]>;
  currentWorkspaceId: Accessor<string | null>;
}

const AuthenticatedContext = createContext<AuthenticatedUserDataContextValue>();
const AuthenticatedUserDataProvider: ParentComponent = (props) => {
  const client = useClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [deletedTags, setDeletedTags] = createSignal<string[]>([]);
  const [currentWorkspaceId] = createResource<string | null>(
    async () => {
      try {
        return await client.userSettings.getWorkspaceId.query();
      } catch (error) {
        const clientError = error as App.ClientError;

        if (clientError.data.cause?.code === "unauthorized") {
          navigate("/auth");
        } else {
          navigate("/workspaces");
        }

        return null;
      }
    },
    { initialValue: null }
  );
  const [userSettings, { mutate: setUserSettings }] = createResource<
    App.AppearanceSettings | null,
    string | null
  >(currentWorkspaceId, () => client.userSettings.get.query(), { initialValue: null });
  const [profile, { mutate: setProfile }] = createResource<App.Profile | null, string | null>(
    currentWorkspaceId,
    () => client.users.get.query(),
    {
      initialValue: null
    }
  );
  const [membership, { mutate: setMembership }] = createResource<
    App.WorkspaceMembership | null,
    string | null
  >(currentWorkspaceId, () => client.workspaceMemberships.get.query(), {
    initialValue: null
  });
  const [workspace, { mutate: setWorkspace }] = createResource<
    Omit<App.Workspace, "contentGroups"> | null,
    string | null
  >(currentWorkspaceId, () => client.workspaces.get.query(), { initialValue: null });
  const [workspaceSettings, { mutate: setWorkspaceSettings }] = createResource<
    App.WorkspaceSettings | null,
    string | null
  >(currentWorkspaceId, () => client.workspaceSettings.get.query(), {
    initialValue: null
  });
  const [role, { mutate: setRole }] = createResource<
    App.ExtendedRole<"baseType"> | null,
    string | null
  >(currentWorkspaceId, () => client.roles.get.query(), {
    initialValue: null
  });
  const loading = (): boolean => {
    return (
      currentWorkspaceId.loading ||
      userSettings.loading ||
      profile.loading ||
      membership.loading ||
      workspace.loading ||
      workspaceSettings.loading ||
      role.loading
    );
  };

  createEffect(
    on([currentWorkspaceId, loading], ([currentWorkspaceId, loading]) => {
      if (!currentWorkspaceId || loading) return;

      const workspaceChanges = client.workspaces.changes.subscribe(undefined, {
        onData({ action, data }) {
          if (action === "update") {
            setWorkspace((workspace) => ({
              ...workspace!,
              ...data
            }));
          } else if (action === "delete") {
            navigate("/workspaces");
          }
        }
      });
      const workspaceMembershipsChanges = client.workspaceMemberships.changes.subscribe(undefined, {
        onData({ action, data }) {
          if (action === "delete" && data.userId === profile()?.id) {
            navigate("/workspaces");
          } else if (action === "update" && data.userId === profile()?.id && data.role) {
            setRole(data.role);
            setMembership((membership) => {
              if (!membership) return null;

              return {
                ...membership,
                roleId: data.role?.id || membership.roleId
              };
            });
          }
        }
      });
      const rolesChanges = client.roles.changes.subscribe(undefined, {
        onData({ action, data }) {
          if (action === "update" && data.id === role()?.id) {
            const previousRole = role();

            setRole((role) => ({
              ...role!,
              ...data
            }));

            if (
              location.pathname === "/editor" &&
              previousRole?.permissions.includes("editContent") &&
              !data.permissions?.includes("editContent")
            ) {
              navigate("/");
            }
          } else if (action === "delete" && data.id === role()?.id) {
            const previousRole = role();

            setRole(data.newRole);

            if (
              location.pathname === "/editor" &&
              previousRole?.permissions.includes("editContent")
            ) {
              navigate("/");
            }
          }
        }
      });
      const usersChanges = client.users.changes.subscribe(undefined, {
        onData({ action, data }) {
          if (action === "update" && profile()) {
            setProfile((profile) => ({
              ...profile!,
              ...data
            }));
          }
        }
      });
      const userSettingsChanges = client.userSettings.changes.subscribe(undefined, {
        onData({ action, data }) {
          if (action === "update" && userSettings()) {
            setUserSettings((userSettings) => ({
              ...userSettings!,
              ...data
            }));
          }
        }
      });
      const workspaceSettingsChanges = client.workspaceSettings.changes.subscribe(undefined, {
        onData({ action, data }) {
          if (action === "update" && workspaceSettings()) {
            setWorkspaceSettings((workspaceSettings) => ({
              ...workspaceSettings!,
              ...data
            }));
          }
        }
      });
      const tagsChanges = client.tags.changes.subscribe(undefined, {
        onData({ action, data }) {
          if (action === "delete") {
            setDeletedTags((deletedTags) => [...deletedTags, data.id]);
          }
        }
      });

      onCleanup(() => {
        workspaceChanges.unsubscribe();
        workspaceMembershipsChanges.unsubscribe();
        rolesChanges.unsubscribe();
        usersChanges.unsubscribe();
        userSettingsChanges.unsubscribe();
        workspaceSettingsChanges.unsubscribe();
        tagsChanges.unsubscribe();
      });
    })
  );

  return (
    <Show when={!loading()}>
      <Show when={currentWorkspaceId()}>
        <AuthenticatedContext.Provider
          value={{
            userSettings,
            profile,
            membership,
            workspace,
            workspaceSettings,
            role,
            deletedTags,
            currentWorkspaceId
          }}
        >
          {props.children}
        </AuthenticatedContext.Provider>
      </Show>
    </Show>
  );
};
const useAuthenticatedUserData = (): AuthenticatedUserDataContextValue => {
  return useContext(AuthenticatedContext)!;
};
const hasPermission = (permission: App.Permission): boolean => {
  const { role } = useAuthenticatedUserData();

  return role()?.permissions.includes(permission) || role()?.baseType === "admin" || false;
};

export { AuthenticatedUserDataProvider, useAuthenticatedUserData, hasPermission };
