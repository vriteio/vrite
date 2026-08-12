import { type Component, createMemo, createSignal, onMount, Match, Switch, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { useLocation, useNavigate } from "@solidjs/router";
import { authClient, client } from "#web/lib/api";
import { IconButton } from "@andesine/components";
import { appendRedirectTo } from "#web/lib/navigation";
import { createMutation } from "@tanstack/solid-query";
import { DotsBackground } from "#web/components/dots-background";

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
  const supportedCodes: Array<Exclude<InviteErrorCode, "UNKNOWN">> = [
    "INVITE_ACCOUNT_MISMATCH",
    "INVITE_ALREADY_ACCEPTED",
    "INVITE_EXPIRED",
    "INVITE_INVALID",
    "UNAUTHORIZED"
  ];
  const rawCode = typeof details.code === "string" ? details.code : "UNKNOWN";
  const code = supportedCodes.includes(rawCode as Exclude<InviteErrorCode, "UNKNOWN">)
    ? (rawCode as InviteErrorCode)
    : rawCode === "FORBIDDEN"
      ? "UNAUTHORIZED"
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
  INVITE_INVALID:
    "This invitation link is invalid. Refresh the page to try again or contact the workspace admin.",
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
  const processInvite = async () => {
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

      setWorkspaceName(result.workspaceName);
      setStatus("success");
      window.location.replace(`/${result.workspaceID}/`);
    } catch (error) {
      const details = getInviteErrorDetails(error);

      setErrorCode(details.code);
      setAcceptedWorkspaceID(details.workspaceID);
      setErrorMessage(inviteErrorMessages[details.code]);
      setStatus("error");
    }
  };

  onMount(() => {
    void processInvite();
  });

  return (
    <main class="relative flex h-full w-full items-center justify-center">
      <Title>Workspace invitation | Andesine</Title>
      <DotsBackground class="absolute mask-edge-fading-16" />
      <div class="relative p-4 lg:p-24">
        <div class="absolute left-0 top-0 h-full w-full rounded-2xl bg-gray-100 mask-edge-fading-4 lg:mask-edge-fading-24" />
        <div class="relative flex w-72 flex-col gap-4">
          <Switch>
            <Match when={status() === "loading"}>
              <div>
                <h1 class="text-2xl font-semibold">Checking invitation</h1>
                <p class="text-sm leading-5 text-gray-400">
                  Please wait while we verify this invitation and your account.
                </p>
              </div>
              <IconButton
                icon="i-lucide:loader-circle"
                class="w-full gap-1"
                iconProps={{ class: "h-5 w-5 text-gray-400" }}
                variant="outlined"
                color="contrast"
                label="Checking invitation..."
                loading={true}
                disabled
              />
            </Match>
            <Match when={status() === "success"}>
              <div>
                <h1 class="text-2xl font-semibold">Invitation accepted</h1>
                <p class="text-sm leading-5 text-gray-400">
                  <Show when={workspaceName()} fallback="Opening your workspace...">
                    {(name) => <>Opening {name()}...</>}
                  </Show>
                </p>
              </div>
              <IconButton
                icon="i-lucide:loader-circle"
                class="w-full gap-1"
                iconProps={{ class: "h-5 w-5 text-gray-400" }}
                variant="outlined"
                color="success"
                label="Redirecting..."
                loading={true}
                disabled
              />
            </Match>
            <Match when={status() === "error"}>
              <div>
                <h1 class="text-2xl font-semibold">Couldn't accept invitation</h1>
                <p class="text-sm leading-5 text-gray-400">{errorMessage()}</p>
              </div>
              <div class="flex flex-col gap-2">
                <Show when={errorCode() === "UNAUTHORIZED"}>
                  <IconButton
                    icon="i-lucide:log-in"
                    class="w-full @hover:bg-gray-50 gap-1"
                    iconProps={{ class: "h-5 w-5 text-gray-400" }}
                    variant="outlined"
                    color="contrast"
                    label="Go to sign in"
                    link={signInLink()}
                  />
                </Show>
                <Show when={errorCode() === "INVITE_ALREADY_ACCEPTED" && acceptedWorkspaceID()}>
                  <IconButton
                    icon="i-lucide:arrow-right"
                    class="w-full @hover:bg-gray-50 gap-1"
                    iconProps={{ class: "h-5 w-5 text-gray-400" }}
                    variant="outlined"
                    color="contrast"
                    label="Open workspace"
                    link={`/${acceptedWorkspaceID()}/`}
                  />
                </Show>
                <Show when={errorCode() === "UNKNOWN"}>
                  <IconButton
                    icon="i-lucide:rotate-cw"
                    class="w-full @hover:bg-gray-50 gap-1"
                    iconProps={{ class: "h-5 w-5 text-gray-400" }}
                    variant="outlined"
                    color="contrast"
                    label="Try again"
                    onClick={() => window.location.reload()}
                  />
                </Show>
                <Show
                  when={
                    errorCode() === "INVITE_EXPIRED" ||
                    errorCode() === "INVITE_INVALID" ||
                    (errorCode() === "INVITE_ALREADY_ACCEPTED" && !acceptedWorkspaceID())
                  }
                >
                  <IconButton
                    icon="i-lucide:arrow-left"
                    class="w-full @hover:bg-gray-50 gap-1"
                    iconProps={{ class: "h-5 w-5 text-gray-400" }}
                    variant="outlined"
                    color="contrast"
                    label="Go back"
                    onClick={() => window.history.back()}
                  />
                </Show>
              </div>
            </Match>
          </Switch>
        </div>
      </div>
    </main>
  );
};

export default InvitePage;
