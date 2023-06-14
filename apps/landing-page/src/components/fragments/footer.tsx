import { mdiAt, mdiGithub, mdiLinkedin, mdiTwitter } from "@mdi/js";
import type { Component } from "solid-js";
import { IconButton, Card, Button } from "#components/primitives";

const Footer: Component = () => {
  return (
    <>
      <Card class="max-w-screen-xl p-4 m-0 md:p-16 w-full flex flex-col justify-center items-center md:items-start rounded-b-none border-b-0 gap-2 text-gray-600 dark:text-gray-300">
        <div class="flex-col md:flex-row flex w-full flex-1 justify-center items-start md:items-center gap-1 md:gap-2">
          <div class="flex w-full flex-col md:flex-row">
            <h2 class="text-3xl md:text-4xl flex-1 text-gray-700 text-center md:text-start">
              Vrite Public Beta
            </h2>
            <div class="flex justify-center md:justify-start items-start md:items-center gap-1 md:gap-2">
              <IconButton
                path={mdiAt}
                variant="text"
                class="m-0"
                size="large"
                link="mailto:hello@vrite.io"
              />
              <IconButton
                path={mdiTwitter}
                variant="text"
                class="m-0"
                size="large"
                link="https://twitter.com/vriteio"
                target="_blank"
              />
              <IconButton
                path={mdiLinkedin}
                variant="text"
                class="m-0"
                size="large"
                link="https://www.linkedin.com/company/vrite/"
                target="_blank"
              />
              <IconButton
                path={mdiGithub}
                variant="text"
                class="m-0"
                size="large"
                link="https://github.com/vriteio/vrite"
                target="_blank"
              />
            </div>
          </div>
        </div>
        <div class="flex flex-col md:flex-row gap-2 justify-center items-center md:items-start min-w-[12rem] md:max-w-unset">
          <Button
            class="m-0 whitespace-nowrap w-full text-center md:w-auto"
            size="large"
            text="soft"
            link="https://docs.vrite.io"
            target="_blank"
          >
            Documentation
          </Button>
          <Button
            class="m-0 whitespace-nowrap w-full text-center md:w-auto"
            size="large"
            text="soft"
            link="/blog"
          >
            Vrite Blog
          </Button>
          <Button
            class="m-0 whitespace-nowrap w-full text-center hidden md:flex md:w-auto"
            size="large"
            text="soft"
            link="https://app.vrite.io"
            target="_blank"
          >
            Sign in
          </Button>
        </div>
        <div class="flex flex-col md:flex-row w-full mt-4 justify-center items-center text-gray-500 dark:text-gray-400">
          <Button
            class="m-0 whitespace-nowrap"
            variant="text"
            text="soft"
            link="/privacy"
            target="_blank"
          >
            Privacy policy
          </Button>
          <Button
            class="m-0 whitespace-nowrap"
            variant="text"
            text="soft"
            link="/tos"
            target="_blank"
          >
            Terms of service
          </Button>
          <div class="flex-1" />
          <span>Vrite ©{new Date().getFullYear()}</span>
        </div>
      </Card>
    </>
  );
};

export { Footer };
