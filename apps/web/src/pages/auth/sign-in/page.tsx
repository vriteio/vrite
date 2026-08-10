import { useSearchParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { type Component, createMemo } from "solid-js";
import { IconButton, Button } from "@andesine/components";
import { useNotify } from "#web/context/notifications";
import { authClient } from "#web/lib/api";
import {
  appendRedirectTo,
  normalizeRedirectTo,
  redirectAfterAuth,
  toCallbackURL
} from "#web/lib/navigation";
import { createMutation } from "@tanstack/solid-query";
import { getPasskeyErrorMessage } from "#web/lib/validation";

const SignInPage: Component = () => {
  const [searchParams] = useSearchParams();
  const notify = useNotify();
  const signInWithPasskeyMutation = createMutation(() => ({
    mutationFn: async () => {
      const { error } = await authClient.signIn.passkey();

      if (error) throw error;

      return true;
    }
  }));
  const signInWithSocialMutation = createMutation(() => ({
    mutationFn: async (input: { provider: "google" | "github"; callbackURL: string }) => {
      const { error } = await authClient.signIn.social({
        provider: input.provider,
        callbackURL: input.callbackURL
      });

      if (error) throw error;

      return true;
    }
  }));
  const signingInWithPasskey = createMemo(() => signInWithPasskeyMutation.isPending);
  const signingInWithGoogle = createMemo(
    () =>
      signInWithSocialMutation.isPending &&
      signInWithSocialMutation.variables?.provider === "google"
  );
  const signingInWithGitHub = createMemo(
    () =>
      signInWithSocialMutation.isPending &&
      signInWithSocialMutation.variables?.provider === "github"
  );
  const redirectTo = () =>
    normalizeRedirectTo(
      Array.isArray(searchParams.redirectTo) ? searchParams.redirectTo[0] : searchParams.redirectTo
    );

  const signInWithPasskey = async () => {
    const startedAt = Date.now();

    try {
      await signInWithPasskeyMutation.mutateAsync();

      await redirectAfterAuth(redirectTo());
    } catch (error) {
      notify({
        type: "error",
        text: getPasskeyErrorMessage(error, "sign-in", Date.now() - startedAt)
      });
    }
  };
  const signInWithProvider = async (provider: "google" | "github") => {
    try {
      await signInWithSocialMutation.mutateAsync({
        provider,
        callbackURL: toCallbackURL(redirectTo())
      });
    } catch {
      notify({
        type: "error",
        text: `${provider === "google" ? "Google" : "GitHub"} sign-in failed`
      });
    }
  };

  return (
    <div class="flex flex-col gap-4">
      <Title>Sign in | Andesine</Title>
      <div>
        <span class="text-2xl font-semibold">Welcome back!</span>
        <div class="text-gray-400 leading-5 text-sm">
          Use one of the methods below, or
          <br />
          <Button
            variant="text"
            size="small"
            hover="underline"
            color="primary"
            class="px-0"
            link={appendRedirectTo("/auth/email?mode=sign-in", redirectTo())}
          >
            continue with email
          </Button>
        </div>
      </div>
      <div class="flex flex-col gap-2.5">
        <IconButton
          icon="i-devicon:google"
          class="w-full @hover:bg-gray-50 gap-1"
          iconProps={{ class: "h-5.5 w-5.5" }}
          variant="outlined"
          color="contrast"
          label={signingInWithGoogle() ? "Continuing with Google..." : "Continue with Google"}
          disabled={signingInWithGoogle() || signingInWithGitHub()}
          onClick={() => {
            void signInWithProvider("google");
          }}
        />
        <IconButton
          icon="i-mdi:github"
          class="w-full @hover:bg-gray-50"
          iconProps={{ class: "text-black" }}
          variant="outlined"
          color="contrast"
          label={signingInWithGitHub() ? "Continuing with GitHub..." : "Continue with GitHub"}
          disabled={signingInWithGoogle() || signingInWithGitHub()}
          onClick={() => {
            void signInWithProvider("github");
          }}
        />
        <div class="flex items-center justify-start gap-2 text-gray-400 text-xs">
          <div class="h-px flex-1 bg-gray-200"></div>
          Or sign in with
          <div class="h-px flex-1 bg-gray-200"></div>
        </div>
        <IconButton
          icon="i-lucide:fingerprint"
          class="w-full @hover:bg-gray-50 gap-1"
          iconProps={{ class: "h-5 w-5 text-gray-400" }}
          variant="outlined"
          color="contrast"
          label="Passkey"
          onClick={signInWithPasskey}
          disabled={signingInWithPasskey() || signingInWithGoogle() || signingInWithGitHub()}
        />
      </div>
      <div class="flex flex-col items-start justify-center w-full transform -bottom-16 text-sm text-gray-400">
        <span>Don't have an account?</span>
        <IconButton
          icon="i-lucide:arrow-right"
          iconProps={{ class: "h-4 w-4" }}
          variant="text"
          text="primary"
          color="primary"
          size="small"
          link={appendRedirectTo("/auth/sign-up", redirectTo())}
          label={() => <span>Sign up</span>}
          hover="underline"
          class="flex-row-reverse gap-1 inline-flex font-medium px-0 -mt-1"
        ></IconButton>
      </div>
    </div>
  );
};

export default SignInPage;
