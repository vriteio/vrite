import { Component } from "solid-js";
import { IconButton, Button } from "@andesine/components";
import { authClient } from "#web/lib/client";
import { action, useAction, useSearchParams, useSubmission } from "@solidjs/router";
import { appendRedirectTo, normalizeRedirectTo, toCallbackURL } from "#web/lib/redirects";
import { useNotify } from "#web/context/notifications";

const signUpWithSocialAction = action(
  async (input: { provider: "google" | "github"; callbackURL: string }) => {
    const { error } = await authClient.signIn.social({
      provider: input.provider,
      callbackURL: input.callbackURL
    });

    if (error) throw error;

    return true;
  }
);

const SignUpPage: Component = () => {
  const [searchParams] = useSearchParams();
  const notify = useNotify();
  const signUpWithSocial = useAction(signUpWithSocialAction);
  const signUpWithGoogleSubmission = useSubmission(signUpWithSocialAction, (input) => {
    return input[0]?.provider === "google";
  });
  const signUpWithGitHubSubmission = useSubmission(signUpWithSocialAction, (input) => {
    return input[0]?.provider === "github";
  });
  const redirectTo = () =>
    normalizeRedirectTo(
      Array.isArray(searchParams.redirectTo) ? searchParams.redirectTo[0] : searchParams.redirectTo
    );
  const signUpWithProvider = async (provider: "google" | "github") => {
    try {
      await signUpWithSocial({
        provider,
        callbackURL: toCallbackURL(redirectTo())
      });
    } catch (error) {
      notify({
        type: "error",
        text: `${provider === "google" ? "Google" : "GitHub"} sign-up failed`
      });
    }
  };

  return (
    <div class="flex flex-col gap-4">
      <div>
        <span class="text-2xl font-semibold">Welcome!</span>
        <div class="text-gray-400 dark:text-gray-500 leading-5 text-sm">
          By registering you agree to our{" "}
          <Button
            link="https://andesine.app/privacy"
            variant="text"
            size="small"
            color="primary"
            class="px-0"
            hover="underline"
          >
            privacy policy
          </Button>{" "}
          and{" "}
          <Button
            link="https://andesine.app/tos"
            variant="text"
            size="small"
            class="px-0"
            color="primary"
            hover="underline"
          >
            terms of use
          </Button>
          .
        </div>
      </div>
      <div class="flex flex-col gap-2.5">
        <IconButton
          icon="i-devicon:google"
          class="w-full @hover:bg-gray-50 gap-1"
          iconProps={{ class: "h-5.5 w-5.5" }}
          variant="outlined"
          color="contrast"
          label={
            signUpWithGoogleSubmission.pending
              ? "Continuing with Google..."
              : "Continue with Google"
          }
          disabled={signUpWithGoogleSubmission.pending || signUpWithGitHubSubmission.pending}
          onClick={() => {
            signUpWithProvider("google");
          }}
        />
        <IconButton
          icon="i-mdi:github"
          class="w-full @hover:bg-gray-50 gap-1"
          iconProps={{ class: "text-black dark:text-white" }}
          variant="outlined"
          color="contrast"
          label={
            signUpWithGitHubSubmission.pending
              ? "Continuing with GitHub..."
              : "Continue with GitHub"
          }
          disabled={signUpWithGoogleSubmission.pending || signUpWithGitHubSubmission.pending}
          onClick={() => {
            signUpWithProvider("github");
          }}
        />

        <div class="flex items-center justify-start gap-2 text-gray-400 dark:text-gray-500 text-xs">
          <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
          Or sign up with
          <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
        </div>
        <div class="flex items-center justify-center gap-1">
          <IconButton
            label="Email"
            class="w-full @hover:bg-gray-50 gap-1"
            color="contrast"
            variant="outlined"
            iconProps={{ class: "h-5.5 w-5.5 text-gray-400 dark:text-gray-500" }}
            icon="i-fluent:mail-16-filled"
            link={appendRedirectTo("/auth/email?mode=sign-up", redirectTo())}
          />
        </div>
      </div>
      <div class="flex flex-col items-start justify-center w-full transform text-sm text-gray-400 dark:text-gray-500">
        <span>Already have an account?</span>
        <IconButton
          icon="i-lucide:arrow-right"
          variant="text"
          text="primary"
          color="primary"
          size="small"
          link={appendRedirectTo("/auth/sign-in", redirectTo())}
          label={() => <span>Sign in</span>}
          iconProps={{ class: "w-4 h-4" }}
          hover="underline"
          class="flex-row-reverse gap-1 inline-flex font-medium px-0 -mt-1"
        ></IconButton>
      </div>
    </div>
  );
};

export default SignUpPage;
