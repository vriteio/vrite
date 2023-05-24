import { mdiGithub } from "@mdi/js";
import type { Component } from "solid-js";
import { Button, IconButton, Card } from "#components/primitives";
import { logoIcon } from "#icons/logo";

const Header: Component = () => {
  return (
    <div class="fixed top-0 left-0 z-50 flex items-center justify-center w-full">
      <Card class="flex w-full max-w-screen-md justify-center items-center">
        <div class="flex items-center justify-start">
          <IconButton
            path={logoIcon}
            color="primary"
            link="/"
            class="bg-gradient-to-tr from-red-500 to-orange-500"
          />
          <span class="flex-1 text-2xl font-extrabold text-gray-600 dark:text-gray-200">rite</span>
        </div>

        <div class="flex-1"></div>
        <IconButton
          link="https://github.com/vriteio/vrite"
          variant="text"
          path={mdiGithub}
          label="Star on GitHub"
        ></IconButton>
        <Button color="primary" link="https://app.vrite.io">
          Sign in
        </Button>
      </Card>
    </div>
  );
};

export { Header };
