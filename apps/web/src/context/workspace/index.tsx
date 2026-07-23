import { createContext, createEffect, createMemo, on, ParentComponent, useContext } from "solid-js";
import { createAsync, query, revalidate } from "@solidjs/router";
import {
  client,
  authClient,
  currentWorkspaceID,
  setCurrentWorkspaceID,
  type Permission
} from "#web/lib/client";
import { validateWorkspaceID } from "#web/lib/validate";
import { useWorkspaceContent } from "./content";
import { createMutation } from "@tanstack/solid-query";
import { toUserID } from "#web/lib/id";

interface WorkspaceProviderProps {
  workspaceID: string;
}
interface WorkspaceInfo {
  id: string;
  name: string;
  logo?: string;
  userID: string;
  permissions: Permission[];
  admin: boolean;
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
  currentSession(): SessionInfo | undefined;
  workspaces(): WorkspaceInfo[];
  refreshWorkspaces(): Promise<void>;
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
        // entry.user.id returned from authClient is a UUID, convert it to the API user ID format
        id: toUserID(entry.user.id),
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
const WorkspaceContext = createContext<WorkspaceContextValue>();
const WorkspaceProvider: ParentComponent<WorkspaceProviderProps> = (props) => {
  if (validateWorkspaceID(props.workspaceID)) {
    setCurrentWorkspaceID(props.workspaceID);
  }

  const content = useWorkspaceContent(currentWorkspaceID);
  const sessions = createAsync(() => listSessionsQuery());
  const workspaces = createAsync(() => listWorkspacesQuery());
  const refreshWorkspaces = () => revalidate("workspaces");
  const switchEnvironment = createMutation(() => ({
    mutationFn: async (input: { workspaceID?: string; sessionToken?: string }) => {
      if (input.sessionToken) {
        await authClient.multiSession.setActive({ sessionToken: input.sessionToken });
      }

      if (input.workspaceID) {
        await client.workspaces.switch({
          workspaceID: input.workspaceID
        });

        return input.workspaceID;
      }

      return "";
    }
  }));
  const currentWorkspace = createMemo(() => {
    const workspaceList = workspaces() ?? [];
    const id = currentWorkspaceID();

    return workspaceList.find((workspace) => workspace.id === id);
  });
  const currentSession = createMemo(() => {
    const sessionList = sessions() ?? [];
    const id = currentWorkspace()?.userID;

    return sessionList.find((session) => session.user.id === id);
  });
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

    const nextWorkspaceID = await switchEnvironment.mutateAsync({
      ...(sessionToken && { sessionToken }),
      workspaceID
    });

    if (nextWorkspaceID) {
      window.location.href = `/${nextWorkspaceID}/`;
    } else {
      window.location.reload();
    }
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

  createEffect(() => {
    const id = currentWorkspaceID();
    const workspaceList = workspaces();

    if (!id || !workspaceList) return;
    if (workspaceList.some((workspace) => workspace.id === id)) return;

    setCurrentWorkspaceID("");
  });

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        currentSession,
        workspaceID: currentWorkspaceID,
        workspaces: () => workspaces() ?? [],
        refreshWorkspaces,
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
