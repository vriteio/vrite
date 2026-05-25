import { createContext, createEffect, on, ParentComponent, useContext } from "solid-js";
import { action, createAsync, query, redirect, reload, useAction } from "@solidjs/router";
import { client, authClient, currentWorkspaceID, setCurrentWorkspaceID } from "#web/lib/client";
import { validateWorkspaceID } from "#web/lib/validate";
import { useWorkspaceContent } from "./content";

interface WorkspaceProviderProps {
  workspaceID: string;
}
interface WorkspaceInfo {
  id: string;
  name: string;
  logo?: string;
  userID: string;
}

interface SessionInfo {
  user: {
    id: string;
    name: string;
    email: string;
  };
  sessionToken: string;
}

interface WorkspaceContextValue {
  currentWorkspace(): WorkspaceInfo | undefined;
  workspaces(): WorkspaceInfo[];
  workspaceID(): string;
  sessions(): SessionInfo[];
  switchWorkspace(id: string): Promise<void>;
  content: ReturnType<typeof useWorkspaceContent>;
}

const listSessionsQuery = query(async () => {
  const { data, error } = await authClient.multiSession.listDeviceSessions();

  if (error || !data) return [] as SessionInfo[];

  return data.map(
    (entry: { session: { token: string }; user: { id: string; name: string; email: string } }) => ({
      user: {
        id: entry.user.id,
        name: entry.user.name,
        email: entry.user.email
      },
      sessionToken: entry.session.token
    })
  ) as SessionInfo[];
}, "sessions");
const listWorkspacesQuery = query(() => {
  return client.workspaces.list();
}, "workspaces");
const switchEnvironmentAction = action(
  async (input: { workspaceID?: string; sessionToken?: string }) => {
    if (input.sessionToken) {
      await authClient.multiSession.setActive({ sessionToken: input.sessionToken });
    }

    if (input.workspaceID) {
      await client.workspaces.switch({
        workspaceID: input.workspaceID
      });

      return redirect(`/${input.workspaceID}/`);
    }

    return reload();
  }
);

const WorkspaceContext = createContext<WorkspaceContextValue>();
const WorkspaceProvider: ParentComponent<WorkspaceProviderProps> = (props) => {
  const content = useWorkspaceContent();
  const sessions = createAsync(() => listSessionsQuery());
  const workspaces = createAsync(() => listWorkspacesQuery());
  const switchEnvironment = useAction(switchEnvironmentAction);
  const currentWorkspace = () => {
    const workspaceList = workspaces() ?? [];
    const id = currentWorkspaceID();

    return workspaceList.find((workspace) => workspace.id === id);
  };
  const switchWorkspace = async (workspaceID: string) => {
    if (workspaceID === currentWorkspaceID()) return;

    const targetWorkspace = (workspaces() ?? []).find((workspace) => workspace.id === workspaceID);
    const current = currentWorkspace();

    let sessionToken = "";

    // If workspace belongs to a different account, switch session first
    if (targetWorkspace && current && targetWorkspace.userID !== current.userID) {
      const targetSession = (sessions() ?? []).find((session) => {
        return session.user.id === targetWorkspace.userID;
      });

      sessionToken = targetSession?.sessionToken || "";
    }

    await switchEnvironment({
      ...(sessionToken && { sessionToken }),
      workspaceID
    });
  };

  createEffect(
    on(
      () => props.workspaceID,
      (id) => {
        if (validateWorkspaceID(id)) {
          setCurrentWorkspaceID(id);
        }
      },
      { defer: true }
    )
  );

  if (validateWorkspaceID(props.workspaceID)) {
    setCurrentWorkspaceID(props.workspaceID);
  }

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        workspaceID: currentWorkspaceID,
        workspaces: () => workspaces() ?? [],
        sessions: () => sessions() ?? [],
        switchWorkspace,
        content
      }}
    >
      {props.children}
    </WorkspaceContext.Provider>
  );
};

const useWorkspace = () => {
  return useContext(WorkspaceContext)!;
};

export { WorkspaceProvider, useWorkspace };
export type { WorkspaceInfo, SessionInfo };
