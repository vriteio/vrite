import {
  createContext,
  createEffect,
  createMemo,
  onCleanup,
  type ParentComponent,
  useContext
} from "solid-js";
import { createAsync, query, revalidate, useParams } from "@solidjs/router";
import { client, authClient, type Permission, type WorkspaceEvent } from "#web/lib/api";
import { validateWorkspaceID } from "#web/lib/validation";
import { useWorkspaceContent } from "./content";
import { createMutation } from "@tanstack/solid-query";
import { toUserID } from "#web/lib/primitives";
import { hasPermission as hasGrantedPermission } from "#web/lib/policy";
import { isWorkspaceEvent } from "#web/lib/validation";
import { clearPersistenceData } from "./indexeddb";

interface WorkspaceInfo {
  id: string;
  name: string;
  logo?: string;
  userID: string;
  currentEntryID?: string;
  permissions: Permission[];
  admin: boolean;
  subscriptionPlan: string;
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
  hasPermission(required: Permission): boolean;
  subscribeToUpdates(listener: (event: WorkspaceEvent) => void): () => void;
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
const listWorkspacesQuery = query(() => client.workspaces.list(), "workspaces");
const WorkspaceContext = createContext<WorkspaceContextValue>();
const WorkspaceProvider: ParentComponent = (props) => {
  const params = useParams<{ workspaceID: string }>();
  const workspaceID = () => (validateWorkspaceID(params.workspaceID) ? params.workspaceID : "");
  const updateListeners = new Set<(event: WorkspaceEvent) => void>();
  const sessions = createAsync(() => listSessionsQuery());
  const workspaces = createAsync(() => listWorkspacesQuery());
  const refreshWorkspaces = () => revalidate("workspaces");
  const switchWorkspaceMutation = createMutation(() => ({
    mutationFn: async (input: {
      workspaceID: string;
      targetSessionToken?: string;
      previousSessionToken?: string;
    }) => {
      if (input.targetSessionToken) {
        const { error } = await authClient.multiSession.setActive({
          sessionToken: input.targetSessionToken
        });

        if (error) throw error;
      }

      await client.workspaces.switch({ workspaceID: input.workspaceID });

      return input.workspaceID;
    },
    onSuccess: (workspaceID) => {
      window.location.href = `/${workspaceID}/`;
    },
    onError: async (_error, input) => {
      if (!input.targetSessionToken || !input.previousSessionToken) return;

      const { error } = await authClient.multiSession.setActive({
        sessionToken: input.previousSessionToken
      });

      if (error) {
        console.error("Failed to restore the previous session", error);
      }
    }
  }));
  const currentWorkspace = createMemo(() => {
    const workspaceList = workspaces() ?? [];
    const id = workspaceID();

    return workspaceList.find((workspace) => workspace.id === id);
  });
  const currentSession = createMemo(() => {
    const sessionList = sessions() ?? [];
    const id = currentWorkspace()?.userID;

    return sessionList.find((session) => session.user.id === id);
  });
  const hasPermission = (required: Permission) => {
    const workspace = currentWorkspace();

    return Boolean(
      workspace?.admin || hasGrantedPermission(workspace?.permissions || [], required)
    );
  };
  const content = useWorkspaceContent(workspaceID, () => hasPermission("content"));
  const subscribeToUpdates = (listener: (event: WorkspaceEvent) => void) => {
    updateListeners.add(listener);

    return () => updateListeners.delete(listener);
  };
  createEffect(() => {
    const workspaceList = workspaces();
    const currentWorkspaceID = workspaceID();

    if (workspaceList === undefined) return;

    void clearPersistenceData({ persist: workspaceList.map(({ id }) => id) });

    if (
      typeof window === "undefined" ||
      !currentWorkspaceID ||
      workspaceList.some(({ id }) => id === currentWorkspaceID)
    ) {
      return;
    }

    void content.disposeWorkspaceContent(currentWorkspaceID).finally(() => {
      const fallbackWorkspace = workspaceList[0];

      window.location.replace(fallbackWorkspace ? `/${fallbackWorkspace.id}/` : "/new-workspace");
    });
  });
  createEffect(() => {
    const currentWorkspaceID = workspaceID();

    if (typeof window === "undefined" || !currentWorkspaceID) return;

    const abortController = new AbortController();
    const waitForRetry = (delay: number) => {
      return new Promise<void>((resolve) => {
        const finish = () => {
          window.clearTimeout(timeout);
          abortController.signal.removeEventListener("abort", finish);
          resolve();
        };
        const timeout = window.setTimeout(finish, delay);

        abortController.signal.addEventListener("abort", finish, { once: true });
      });
    };

    onCleanup(() => abortController.abort());

    void (async () => {
      let retryDelay = 1_000;

      while (!abortController.signal.aborted && workspaceID() === currentWorkspaceID) {
        try {
          const updates = await client.sync.workspaceUpdates(undefined, {
            signal: abortController.signal
          });

          try {
            await content.syncWorkspaceContent(currentWorkspaceID);
            retryDelay = 1_000;

            for await (const event of updates) {
              if (abortController.signal.aborted || workspaceID() !== currentWorkspaceID) {
                break;
              }

              if (!isWorkspaceEvent(event)) continue;

              if (
                event.action.startsWith("entry:") ||
                event.action.startsWith("collection:") ||
                event.action.startsWith("publishing:")
              ) {
                content.applyWorkspaceEvent(currentWorkspaceID, event);
              }

              if (
                event.action.startsWith("membership:") ||
                event.action.startsWith("role:") ||
                event.action.startsWith("workspace:")
              ) {
                void refreshWorkspaces();
              }

              for (const listener of updateListeners) {
                try {
                  listener(event);
                } catch (error) {
                  console.error("Workspace update listener failed", error);
                }
              }
            }
          } finally {
            await updates.return?.();
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            console.error("Workspace update stream disconnected", error);
          }
        }

        if (!abortController.signal.aborted) {
          await waitForRetry(retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30_000);
        }
      }
    })();
  });
  const switchWorkspace = async (workspaceID: string) => {
    if (workspaceID === params.workspaceID) return;

    const targetWorkspace = (workspaces() ?? []).find((workspace) => workspace.id === workspaceID);
    const current = currentWorkspace();

    if (!targetWorkspace) {
      throw new Error("Workspace not found");
    }

    let targetSessionToken: string | undefined;
    const previousSessionToken = currentSession()?.sessionToken;

    if (targetWorkspace.userID !== current?.userID) {
      const targetSession = (sessions() ?? []).find((session) => {
        return session.user.id === targetWorkspace.userID;
      });

      if (!targetSession || !previousSessionToken) {
        throw new Error("Workspace account session not found");
      }

      targetSessionToken = targetSession.sessionToken;
    }

    await switchWorkspaceMutation.mutateAsync({
      workspaceID,
      targetSessionToken,
      previousSessionToken
    });
  };

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        currentSession,
        workspaceID,
        workspaces: () => workspaces() ?? [],
        refreshWorkspaces,
        sessions: () => sessions() ?? [],
        hasPermission,
        subscribeToUpdates,
        switchWorkspace,
        content
      }}
    >
      {props.children}
    </WorkspaceContext.Provider>
  );
};

const useWorkspace = () => useContext(WorkspaceContext)!;

export { WorkspaceProvider, useWorkspace };
export type { WorkspaceInfo, SessionInfo };
