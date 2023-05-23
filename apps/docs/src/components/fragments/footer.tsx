import { mdiAt, mdiGithub, mdiLinkedin, mdiTwitter } from "@mdi/js";
import type { Component } from "solid-js";
import { IconButton, Card } from "#components/primitives";

const Footer: Component = () => {
  return (
    <>
      <Card class="max-w-screen-xl p-4 m-0 md:p-16 w-full flex flex-col justify-center items-start rounded-b-none border-b-0 gap-1 md:gap-0 text-gray-600 dark:text-gray-300">
        <div class="flex-col md:flex-row flex w-full flex-1 justify-center items-start md:items-center gap-1 md:gap-2">
          <div class="flex flex-col w-full">
            <h2 class="text-3xl md:text-4xl flex-1">Public Beta</h2>
          </div>
        </div>
        <div class="flex flex-col md:flex-row w-full justify-start items-start md:items-center gap-1 md:gap-2">
          <IconButton
            path={mdiAt}
            variant="text"
            text="soft"
            label="Email"
            class="m-0"
            link="mailto:hello@vrite.io"
          />
          <IconButton
            path={mdiTwitter}
            variant="text"
            text="soft"
            label="Twitter"
            class="m-0"
            link="https://twitter.com/vriteio"
          />
          <IconButton
            path={mdiLinkedin}
            variant="text"
            text="soft"
            label="LinkedIn"
            class="m-0"
            link="https://www.linkedin.com/company/vrite/"
          />
          <IconButton
            path={mdiGithub}
            variant="text"
            text="soft"
            label="GitHub"
            class="m-0"
            link="https://github.com/vriteio/vrite"
          />
        </div>
        <span class="text-left md:text-center w-full text-sm mt-4">
          Vrite ©{new Date().getFullYear()}
        </span>
      </Card>
    </>
  );
};

export { Footer };
