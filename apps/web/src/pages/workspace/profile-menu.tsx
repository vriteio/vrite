import { authClient } from "#web/lib/client";
import { DropdownArea, DropdownMenu, MenuItem } from "@andesine/components";
import { Component, createMemo, createSignal, JSX } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useWorkspace } from "#web/context/workspace";
import { clearPersistenceData } from "#web/context/workspace/persistence";
import clsx from "clsx";
import { createMutation } from "@tanstack/solid-query";

interface ProfileMenuProps {
  color?: "base" | "contrast";
  class?: string;
}

const ProfileMenu: Component<ProfileMenuProps> = (props) => {
  const { currentWorkspace, workspaces, sessions, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const revokeSessionMutation = createMutation(() => ({
    mutationFn: async (input: { sessionToken: string }) => {
      await authClient.multiSession.revoke(input);

      return true;
    }
  }));
  const signOutMutation = createMutation(() => ({
    mutationFn: async () => {
      await authClient.signOut();

      return true;
    }
  }));
  const [menuOpened, setMenuOpened] = createSignal(false);
  const logoutPending = () => {
    return revokeSessionMutation.isPending || signOutMutation.isPending;
  };

  const dropdownOptions = createMemo(() => {
    const dropdownOptions: Array<Array<MenuItem | (() => JSX.Element)>> = [];
    const sessionList = sessions();
    const workspaceList = workspaces();
    const currentUser = sessionList.find((session) => {
      return session.user.id === currentWorkspace()?.userID;
    })?.user;

    dropdownOptions.push([
      () => (
        <div class="px-1 py-0.5 flex flex-col">
          <span class="text-sm leading-5 font-medium text-gray-900 dark:text-white line-clamp-1">
            {currentUser?.name || currentUser?.email}
          </span>
          <span class="text-xs leading-none text-gray-500 dark:text-gray-400 line-clamp-1">
            {currentUser?.email}
          </span>
        </div>
      )
    ]);

    if (sessionList.length > 0) {
      const switchWorkspaceChildren: Array<Array<MenuItem | (() => JSX.Element)>> = sessionList.map(
        (session) => {
          const userWorkspaces = workspaceList.filter((ws) => ws.userID === session.user.id);

          return [
            [
              () => (
                <div class="px-1 py-0.5 flex flex-col">
                  <span class="text-sm leading-5 font-medium text-gray-700 dark:text-gray-300 truncate">
                    {session.user.name || session.user.email}
                  </span>
                  <span class="text-xs leading-none text-gray-500 dark:text-gray-400 truncate">
                    {session.user.email}
                  </span>
                </div>
              )
            ],
            userWorkspaces.map((ws) => ({
              label: ws.name,
              icon: "i-lucide:hexagon",
              selected: ws.id === currentWorkspace()?.id,
              onClick() {
                switchWorkspace(ws.id);
              }
            }))
          ] as unknown as Array<MenuItem | (() => JSX.Element)>;
        }
      );

      dropdownOptions.push([
        {
          label: "Switch workspace",
          icon: () => (
            <div class="h-full w-full relative">
              <div class="h-full w-full absolute top-0 left-0 i-lucide:hexagon z-1" />
              <div class="h-3.5 w-3.5 absolute -bottom-0.5 -right-0.5 i-tabler:hexagon-filled opacity-40" />
            </div>
          ),
          items: switchWorkspaceChildren
        }
      ]);
    } else {
      // Fallback: simple workspace list
      const workspaceOptions: Array<MenuItem | (() => JSX.Element)> = workspaceList.map((ws) => ({
        label: ws.name,
        icon: "i-lucide:hexagon",
        selected: ws.id === currentWorkspace()?.id,
        onClick() {
          switchWorkspace(ws.id);
        }
      }));

      if (workspaceOptions.length > 0) {
        dropdownOptions.push([
          { label: "Switch workspace", icon: "i-lucide:users", items: workspaceOptions }
        ]);
      }
    }

    // Create workspace + Add account
    dropdownOptions.push([
      {
        label: "Create workspace",
        icon: "i-lucide:plus",
        onClick() {
          navigate("/new-workspace");
        }
      },
      {
        label: "Add account",
        icon: "i-lucide:user-plus",
        onClick() {
          navigate("/auth/sign-in?addAccount=true");
        }
      }
    ]);

    // Logout
    dropdownOptions.push([
      {
        label: logoutPending() ? "Logging out..." : "Log out",
        icon: "i-lucide:log-out",
        color: "danger",
        async onClick() {
          if (logoutPending()) return;

          const sessionList = sessions();
          const current = currentWorkspace();
          const persistedWorkspaceIDs =
            sessionList.length > 1
              ? workspaceList
                  .filter((workspace) => workspace.userID !== current?.userID)
                  .map(({ id }) => id)
              : [];

          await clearPersistenceData({ persist: persistedWorkspaceIDs });

          if (sessionList.length > 1) {
            const currentSession = sessionList.find((s) => s.user.id === current?.userID);

            if (currentSession) {
              await revokeSessionMutation.mutateAsync({
                sessionToken: currentSession.sessionToken
              });
            }

            // Find a workspace belonging to another session
            const otherSession = sessionList.find((s) => s.user.id !== current?.userID);
            const otherWorkspace = workspaceList.find(
              (ws) => otherSession && ws.userID === otherSession.user.id
            );

            if (otherWorkspace) {
              window.location.href = `/${otherWorkspace.id}/`;
            } else {
              window.location.reload();
            }
          } else {
            await signOutMutation.mutateAsync();
            window.location.href = "/auth/sign-in";
          }
        }
      }
    ]);

    return dropdownOptions;
  });
  return (
    <div class={clsx("p-1", props.class)}>
      <DropdownArea>
        <DropdownMenu
          cardProps={{ class: "w-56" }}
          opened={menuOpened()}
          setOpened={setMenuOpened}
          placement="top-start"
          trigger={() => (
            <button
              class={clsx(
                "flex gap-1 items-center w-full rounded-lg px-1 py-1 transition-colors focus:outline-none",
                "hover:bg-gray-200 dark:hover:bg-gray-800"
              )}
            >
              <div class="i-lucide:hexagon h-5 w-5 text-gray-500 dark:text-gray-400" />
              <span class="flex-1 text-start text-sm font-medium truncate">
                {currentWorkspace()?.name || "Workspace"}
              </span>
              <div class="i-lucide:chevrons-up-down h-4 w-4 text-gray-400 dark:text-gray-500" />
            </button>
          )}
          items={dropdownOptions()}
        />
      </DropdownArea>
    </div>
  );
};

export { ProfileMenu };
