import { Component, createMemo, createSignal, onMount, Match, Switch, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { revalidate, useLocation, useNavigate } from "@solidjs/router";
import { authClient, client } from "#web/lib/client";
import { Button, Spinner } from "@andesine/components";
import { appendRedirectTo } from "#web/lib/redirects";
import { createMutation } from "@tanstack/solid-query";

type InviteErrorCode =
  | "INVITE_ACCOUNT_MISMATCH"
  | "INVITE_ALREADY_ACCEPTED"
  | "INVITE_EXPIRED"
  | "INVITE_INVALID"
  | "UNAUTHORIZED"
  | "UNKNOWN";

const getInviteErrorDetails = (error: unknown): { code: InviteErrorCode; workspaceID?: string } => {
  if (!error || typeof error !== "object") return { code: "UNKNOWN" };

  const details = error as { code?: unknown; data?: unknown };
  const supportedCodes: InviteErrorCode[] = [
    "INVITE_ACCOUNT_MISMATCH",
    "INVITE_ALREADY_ACCEPTED",
    "INVITE_EXPIRED",
    "INVITE_INVALID",
    "UNAUTHORIZED"
  ];
  const code =
    typeof details.code === "string" && supportedCodes.includes(details.code as InviteErrorCode)
      ? (details.code as InviteErrorCode)
      : "UNKNOWN";
  const data =
    details.data && typeof details.data === "object"
      ? (details.data as { workspaceID?: unknown })
      : undefined;

  return {
    code,
    ...(typeof data?.workspaceID === "string" && { workspaceID: data.workspaceID })
  };
};
const inviteErrorMessages: Record<InviteErrorCode, string> = {
  INVITE_ACCOUNT_MISMATCH: "This invitation was sent to another account.",
  INVITE_ALREADY_ACCEPTED: "This invitation has already been accepted.",
  INVITE_EXPIRED: "This invitation has expired. Ask a workspace admin for a new link.",
  INVITE_INVALID: "This invitation link is invalid.",
  UNAUTHORIZED: "Sign in to the invited account to accept this invitation.",
  UNKNOWN: "Failed to accept the invitation. Please try again."
};

const InvitePage: Component = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = createSignal<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = createSignal("Something went wrong");
  const [errorCode, setErrorCode] = createSignal<InviteErrorCode>("UNKNOWN");
  const [acceptedWorkspaceID, setAcceptedWorkspaceID] = createSignal<string>();
  const [workspaceName, setWorkspaceName] = createSignal<string | null>(null);
  const acceptInviteMutation = createMutation(() => ({
    mutationFn: (input: { id: string; expires: number; signature: string }) => {
      return client.memberships.acceptInvite(input);
    }
  }));
  const redirectTarget = createMemo(() => `${location.pathname}${location.search}${location.hash}`);
  const signInLink = createMemo(() => appendRedirectTo("/auth/sign-in", redirectTarget()));
  const switchAccountLink = createMemo(() =>
    appendRedirectTo("/auth/sign-in?addAccount=true", redirectTarget())
  );
  const canSwitchAccount = () => errorCode() === "INVITE_ACCOUNT_MISMATCH";

  onMount(async () => {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    const expires = Number(params.get("expires"));
    const signature = params.get("signature");

    if (!id || !Number.isSafeInteger(expires) || !signature) {
      setErrorCode("INVITE_INVALID");
      setErrorMessage(inviteErrorMessages.INVITE_INVALID);
      setStatus("error");

      return;
    }

    const { data } = await authClient.getSession();

    if (!data?.session) {
      navigate(signInLink(), { replace: true });

      return;
    }

    try {
      const result = await acceptInviteMutation.mutateAsync({ id, expires, signature });

      await revalidate("workspaces");
      setWorkspaceName(result.workspaceName);
      setStatus("success");
      setTimeout(() => navigate(`/${result.workspaceID}/`), 1600);
    } catch (error) {
      const details = getInviteErrorDetails(error);

      setErrorCode(details.code);
      setAcceptedWorkspaceID(details.workspaceID);
      setErrorMessage(inviteErrorMessages[details.code]);
      setStatus("error");
    }
  });

  return (
    <div class="flex h-full w-full items-center justify-center">
      <Title>Workspace invitation | Andesine</Title>
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
              <Show when={errorCode() === "UNAUTHORIZED"}>
                <Button size="small" color="primary" link={signInLink()}>
                  Go to sign in
                </Button>
              </Show>
              <Show when={errorCode() === "INVITE_ALREADY_ACCEPTED" && acceptedWorkspaceID()}>
                <Button size="small" color="primary" link={`/${acceptedWorkspaceID()}/`}>
                  Open workspace
                </Button>
              </Show>
              <Show when={errorCode() === "UNKNOWN"}>
                <Button size="small" color="primary" onClick={() => window.location.reload()}>
                  Try again
                </Button>
              </Show>
              <Show
                when={
                  errorCode() === "INVITE_EXPIRED" ||
                  errorCode() === "INVITE_INVALID" ||
                  (errorCode() === "INVITE_ALREADY_ACCEPTED" && !acceptedWorkspaceID())
                }
              >
                <Button
                  size="small"
                  variant="outlined"
                  text="soft"
                  onClick={() => window.history.back()}
                >
                  Go back
                </Button>
              </Show>
            </div>
          </Match>
        </Switch>
      </div>
    </div>
  );
};

export default InvitePage;
