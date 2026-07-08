import { Component, createMemo, createSignal, onMount, Match, Switch, Show } from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";
import { authClient, client, setCurrentWorkspaceID } from "#web/lib/client";
import { Button, Spinner } from "@andesine/components";
import { appendRedirectTo } from "#web/lib/redirects";
import { createMutation } from "@tanstack/solid-query";

const InvitePage: Component = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = createSignal<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = createSignal("Something went wrong");
  const [workspaceName, setWorkspaceName] = createSignal<string | null>(null);
  const acceptInviteMutation = createMutation(() => ({
    mutationFn: (input: { token: string }) => {
      return client.memberships.acceptInvite(input);
    }
  }));
  const redirectTarget = createMemo(() => `${location.pathname}${location.search}${location.hash}`);
  const signInLink = createMemo(() => appendRedirectTo("/auth/sign-in", redirectTarget()));
  const switchAccountLink = createMemo(() =>
    appendRedirectTo("/auth/sign-in?addAccount=true", redirectTarget())
  );
  const canSwitchAccount = createMemo(
    () =>
      errorMessage().includes("Sign in with that account") ||
      errorMessage().includes("authenticated")
  );

  onMount(async () => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (!token) {
      setErrorMessage("Invalid invite link");
      setStatus("error");

      return;
    }

    const { data } = await authClient.getSession();

    if (!data?.session) {
      navigate(signInLink(), { replace: true });

      return;
    }

    try {
      const result = await acceptInviteMutation.mutateAsync({ token });

      setCurrentWorkspaceID(result.workspaceID);
      setWorkspaceName(result.workspaceName);
      setStatus("success");
      setTimeout(() => navigate(`/${result.workspaceID}/`), 1600);
    } catch (error) {
      setErrorMessage("Failed to accept invite");
      setStatus("error");
    }
  });

  return (
    <div class="flex h-full w-full items-center justify-center">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm px-4">
        <Switch>
          <Match when={status() === "loading"}>
            <Spinner class="h-12 w-12" />
            <span class="text-lg font-medium">Checking your invite...</span>
          </Match>
          <Match when={status() === "success"}>
            <div class="h-12 w-12 i-lucide:check-circle text-green-500" />
            <span class="text-lg font-medium">Invite accepted!</span>
            <span class="text-sm text-gray-400 dark:text-gray-500">
              <Show when={workspaceName()} fallback="Redirecting to your workspace...">
                {(name) => <>Redirecting you to {name()}...</>}
              </Show>
            </span>
          </Match>
          <Match when={status() === "error"}>
            <div class="h-12 w-12 i-lucide:x-circle text-red-500" />
            <span class="text-lg font-medium">Couldn't accept invite</span>
            <span class="text-sm text-gray-400 dark:text-gray-500">{errorMessage()}</span>
            <div class="mt-2 flex flex-col sm:flex-row gap-2">
              <Show when={canSwitchAccount()}>
                <Button size="small" color="primary" link={switchAccountLink()}>
                  Sign in with another account
                </Button>
              </Show>
              <Button size="small" variant="outlined" text="soft" link={signInLink()}>
                Go to sign in
              </Button>
            </div>
          </Match>
        </Switch>
      </div>
    </div>
  );
};

export default InvitePage;
