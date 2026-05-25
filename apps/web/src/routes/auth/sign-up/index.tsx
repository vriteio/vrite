import { Component } from "solid-js";
import { IconButton, Button } from "#web/components/primitives";

const SignUpPage: Component = () => {
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
          label="Continue with Google"
          link={`${import.meta.env.PUBLIC_API_URL}/auth/google`}
        />
        <IconButton
          icon="i-mdi:github"
          class="w-full @hover:bg-gray-50 gap-1"
          iconProps={{ class: "text-black dark:text-white" }}
          variant="outlined"
          color="contrast"
          label="Continue with GitHub"
          link={`${import.meta.env.PUBLIC_API_URL}/auth/github`}
        />

        <div class="flex items-center justify-start gap-2 text-gray-400 dark:text-gray-500 text-xs">
          <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
          Or sign up with
          <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
        </div>
        <div class="flex items-center justify-center gap-1">
          <IconButton
            label="Email"
            class="w-full @hover:bg-gray-50"
            color="contrast"
            variant="outlined"
            iconProps={{ class: "h-5.5 w-5.5 text-gray-500 dark:text-gray-400" }}
            icon="i-fluent:mail-16-filled"
            link="/auth/email"
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
          link="/auth/sign-in"
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
