import { Component } from "solid-js";
import { IconButton, Button } from "#web/components/primitives";
import { useNotify } from "#web/context";
import { useNavigate } from "@solidjs/router";

const SignInPage: Component = () => {
  const navigate = useNavigate();
  const notify = useNotify();

  return (
    <div class="flex flex-col gap-4">
      <div>
        <span class="text-2xl font-semibold">Welcome back!</span>
        <div class="text-gray-400 dark:text-gray-500 leading-5 text-sm">
          Use one of the methods below, or
          <br />
          <Button
            variant="text"
            size="small"
            hover="underline"
            color="primary"
            class="px-0"
            link="/auth/sign-in"
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
      </div>
      <div class="flex flex-col items-start justify-center w-full transform -bottom-16 text-sm text-gray-400 dark:text-gray-500">
        <span>Don't have an account?</span>
        <IconButton
          icon="i-lucide:arrow-right"
          iconProps={{ class: "h-4 w-4" }}
          variant="text"
          text="primary"
          color="primary"
          size="small"
          link="/auth/sign-up"
          label={() => <span>Sign up</span>}
          hover="underline"
          class="flex-row-reverse gap-1 inline-flex font-medium px-0 -mt-1"
        ></IconButton>
      </div>
    </div>
  );
};

export default SignInPage;
