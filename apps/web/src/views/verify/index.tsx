import { mdiCheckCircle, mdiLinkVariantOff } from "@mdi/js";
import { useNavigate } from "@solidjs/router";
import { Component, Match, Show, Switch, createMemo, createSignal } from "solid-js";
import { App, useClientContext, useUIContext } from "#context";
import { Button, Card, Heading, Icon, Loader } from "#components/primitives";
import { navigateAndReload } from "#lib/utils";

const VerifyView: Component = () => {
  const { client } = useClientContext();
  const { setStorage } = useUIContext();
  const [verified, setVerified] = createSignal(false);
  const [navigating, setNavigating] = createSignal(false);
  const [newWorkspaceId, setNewWorkspaceId] = createSignal<string | null>(null);
  const [error, setError] = createSignal<"invalid" | "unauthorized" | null>(null);
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const [redirect, setRedirect] = createSignal("/");
  const type = params.get("type");
  const code = params.get("code");
  const id = params.get("id") || "";
  const label = createMemo(() => {
    switch (type) {
      case "email":
        return "Email";
      case "magic":
        return "Magic link";
      case "workspace-invite":
        return "Workspace invite";
      case "email-change":
        return "Email change";
      case "password-change":
        return "Password change";
      default:
        return "";
    }
  });
  const verifyEmail = async (): Promise<void> => {
    const redirect = await client.verification.verifyEmail.mutate({ code: code || "", userId: id });

    setRedirect(redirect);
    setVerified(true);
  };
  const verifyMagicLink = async (): Promise<void> => {
    const redirect = await client.verification.verifyMagicLink.mutate({
      code: code || "",
      userId: id
    });

    setVerified(true);
    navigate(redirect);
  };
  const verifyWorkspaceInvite = async (): Promise<void> => {
    const workspaceId = await client.verification.verifyWorkspaceInvite.mutate({
      code: code || "",
      membershipId: id
    });

    setNewWorkspaceId(workspaceId);
    setVerified(true);
  };
  const verify = async (): Promise<void> => {
    if (!type || !code) {
      setError("invalid");

      return;
    }

    try {
      switch (type) {
        case "email":
          await verifyEmail();
          break;
        case "magic":
          await verifyMagicLink();
          break;
        case "workspace-invite":
          await verifyWorkspaceInvite();
          break;
        case "email-change":
          await client.verification.verifyEmailChange.mutate({ code });
          setVerified(true);
          break;
        case "password-change":
          await client.verification.verifyPasswordChange.mutate({ code });
          setVerified(true);
          break;
      }
    } catch (error) {
      const clientError = error as App.ClientError;

      if (clientError.data.cause?.code === "unauthorized") {
        setError("unauthorized");
      } else {
        setError("invalid");
      }
    }
  };

  verify();

  return (
    <div class="flex flex-col flex-1 h-full overflow-hidden scrollbar-contrast justify-center items-center">
      <Card class="justify-center items-center flex flex-col w-96 p-3 relative">
        <Heading>
          {error() === "invalid" && "Link invalid"}
          {error() === "unauthorized" && "Unauthorized"}
          {!error() && !verified() && "Verifying"}
          {verified() && "Verified"}
        </Heading>
        <Show when={label()}>
          <span class="text-gray-500 dark:text-gray-400">{label()}</span>
        </Show>
        <div class="flex flex-col justify-center items-center mt-3">
          <Switch>
            <Match when={error()}>
              <Icon path={mdiLinkVariantOff} class="h-12 w-12 fill-[url(#gradient)]" />
            </Match>
            <Match when={!verified()}>
              <Loader color="primary" class="h-12 w-12" />
            </Match>
            <Match when={verified()}>
              <Icon path={mdiCheckCircle} class="h-12 w-12 fill-[url(#gradient)]" />
            </Match>
          </Switch>
        </div>
        <Show when={error() === "unauthorized"}>
          <p class="lowercase first-letter:capitalize">Sign in to verify the {label()}</p>
          <Button
            color="primary"
            class="w-full max-w-40"
            onClick={() => {
              navigateAndReload(`/auth?redirect=${encodeURIComponent(window.location.href)}`);
            }}
          >
            Sign in
          </Button>
        </Show>
        <Show when={verified()}>
          <Button
            text="soft"
            size="small"
            class="absolute -bottom-8"
            variant="text"
            loading={navigating()}
            onClick={async () => {
              setNavigating(true);

              const workspaceId = newWorkspaceId();

              if (workspaceId) {
                await client.auth.switchWorkspace.mutate(workspaceId);
                setStorage((storage) => ({
                  sidePanelWidth: storage.sidePanelWidth
                }));
                navigate("/");
              }

              navigateAndReload(redirect());
              setNavigating(false);
            }}
          >
            <Show when={!newWorkspaceId()} fallback="Go to the workspace">
              {redirect() === "/" ? "Go to dashboard" : "Verify workspace invite"}
            </Show>
          </Button>
        </Show>
      </Card>
    </div>
  );
};

export { VerifyView };
