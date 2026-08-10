import { authClient } from "#web/lib/api";
import { DropdownArea, DropdownMenu, type MenuItem } from "@andesine/components";
import { type Component, createMemo, createSignal, type JSX, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useWorkspace } from "#web/context/workspace";
import { clearPersistenceData } from "#web/context/workspace/persistence";
import clsx from "clsx";
import { createMutation } from "@tanstack/solid-query";

interface ProfileMenuProps {
  color?: "base" | "contrast";
  class?: string;
  compact?: boolean;
}

const ProfileMenu: Component<ProfileMenuProps> = (props) => {
  const { currentWorkspace, workspaces, sessions, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const revokeSessionMutation = createMutation(() => ({
    mutationFn: async (input: {
      sessionToken: string;
      nextSessionToken: string;
      nextPath: string;
    }) => {
      const { error: revokeError } = await authClient.multiSession.revoke({
        sessionToken: input.sessionToken
      });

      if (revokeError) throw revokeError;

      const { error: activateError } = await authClient.multiSession.setActive({
        sessionToken: input.nextSessionToken
      });

      if (activateError) throw activateError;

      return input.nextPath;
    },
    onSuccess: (nextPath) => {
      window.location.href = nextPath;
    },
    onError: () => {
      window.location.reload();
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
          <span class="text-sm leading-5 font-medium text-gray-900 line-clamp-1">
            {currentUser?.name || currentUser?.email}
          </span>
          <span class="text-xs leading-none text-gray-500 line-clamp-1">{currentUser?.email}</span>
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
                  <span class="text-sm leading-5 font-medium text-gray-700 truncate">
                    {session.user.name || session.user.email}
                  </span>
                  <span class="text-xs leading-none text-gray-500 truncate">
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
                return switchWorkspace(ws.id);
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
          return switchWorkspace(ws.id);
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
            const otherSession = sessionList.find((s) => s.user.id !== current?.userID);
            const otherWorkspace = workspaceList.find(
              (ws) => otherSession && ws.userID === otherSession.user.id
            );

            if (!currentSession || !otherSession) {
              window.location.reload();

              return;
            }

            await revokeSessionMutation.mutateAsync({
              sessionToken: currentSession.sessionToken,
              nextSessionToken: otherSession.sessionToken,
              nextPath: otherWorkspace ? `/${otherWorkspace.id}/` : "/new-workspace"
            });
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
    <div class={props.class}>
      <DropdownArea>
        <DropdownMenu
          class={props.compact ? "h-full w-full" : undefined}
          cardProps={{ class: "w-56 max-md:bg-gray-100" }}
          opened={menuOpened()}
          setOpened={setMenuOpened}
          placement="top-start"
          trigger={() => (
            <button
              aria-label={props.compact ? "Account" : undefined}
              class={clsx(
                "flex gap-1 items-center w-full px-1 py-1 transition-colors focus:outline-none",
                props.compact ? "h-full justify-center" : "rounded-lg",
                "@hover:bg-gray-200"
              )}
            >
              <div class="i-lucide:hexagon h-5 w-5 text-gray-500" />
              <Show when={!props.compact}>
                <span class="flex-1 truncate text-start text-sm font-medium">
                  {currentWorkspace()?.name || "Workspace"}
                </span>
                <div class="i-lucide:chevrons-up-down h-4 w-4 text-gray-400" />
              </Show>
            </button>
          )}
          items={dropdownOptions()}
        />
      </DropdownArea>
    </div>
  );
};

export { ProfileMenu };
