import { mdiClose, mdiGithub, mdiMenu } from "@mdi/js";
import { Component, createSignal } from "solid-js";
import clsx from "clsx";
import { Button, IconButton, Card } from "#components/primitives";
import { logoIcon } from "#icons/logo";

const Header: Component = () => {
  const [menuOpened, setMenuOpened] = createSignal(false);

  return (
    <div class="fixed top-0 left-0 z-50 flex items-center justify-center w-screen">
      <Card class="max-w-4xl p-3 w-full">
        <div class="flex justify-center items-center w-full">
          <div class="flex items-center justify-start pr-2">
            <IconButton
              path={logoIcon}
              color="primary"
              link="/"
              class="bg-gradient-to-tr from-red-500 to-orange-500 m-0 mr-1"
            />
            <span class="flex-1 text-2xl font-extrabold text-gray-600 dark:text-gray-200">
              rite
            </span>
          </div>
          <div class="gap-1 hidden md:flex">
            <Button link="https://docs.vrite.io" variant="text" class="m-0" target="_blank">
              Documentation
            </Button>
            <Button link="/pricing" variant="text" class="m-0" target="_blank">
              Pricing
            </Button>
            <Button link="/blog" variant="text" class="m-0">
              Blog
            </Button>
          </div>
          <div class="flex-1"></div>
          <div class="gap-2 hidden md:flex">
            <IconButton
              link="https://github.com/vriteio/vrite"
              variant="text"
              path={mdiGithub}
              class="m-0"
              label="Star on GitHub"
              target="_blank"
            ></IconButton>
            <Button color="primary" link="https://app.vrite.io" class="m-0" target="_blank">
              Sign in
            </Button>
          </div>
          <IconButton
            path={menuOpened() ? mdiClose : mdiMenu}
            class="m-0 md:hidden"
            variant="text"
            onClick={() => {
              setMenuOpened(!menuOpened());
            }}
          />
        </div>
        <div
          class={clsx(
            "gap-1 flex flex-col justify-center items-center md:hidden overflow-hidden transition-all duration-300 ease-out",
            menuOpened() ? "max-h-[6.5rem]" : "max-h-0"
          )}
        >
          <Button link="https://docs.vrite.io" variant="text" class="m-0" target="_blank">
            Documentation
          </Button>
          <Button link="/blog" variant="text" class="m-0">
            Blog
          </Button>
          <IconButton
            link="https://github.com/vriteio/vrite"
            variant="text"
            path={mdiGithub}
            class="m-0"
            label="Star on GitHub"
            target="_blank"
          ></IconButton>
        </div>
      </Card>
    </div>
  );
};

export { Header };
