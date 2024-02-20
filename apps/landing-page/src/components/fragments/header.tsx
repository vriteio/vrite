import { mdiClose, mdiGithub, mdiMenu } from "@mdi/js";
import { Component, createSignal } from "solid-js";
import clsx from "clsx";
import { Button, IconButton, Card } from "#components/primitives";
import { logoIcon } from "#icons/logo";

const HeaderOld: Component = () => {
  const [menuOpened, setMenuOpened] = createSignal(false);

  return (
    <div class="fixed top-0 left-0 z-50 flex items-center justify-center w-screen">
      <Card class="max-w-4xl p-3 w-full bg-gray-50 dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 backdrop-blur-md border-0">
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
            <Button link="https://docs.vrite.io" variant="text" class="m-0">
              Documentation
            </Button>
            <Button link="/pricing" variant="text" class="m-0">
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
            <Button color="primary" link="https://app.vrite.io" class="m-0">
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
            menuOpened() ? "max-h-[8.5rem]" : "max-h-0"
          )}
        >
          <Button link="https://docs.vrite.io" variant="text" class="m-0">
            Documentation
          </Button>
          <Button link="/pricing" variant="text" class="m-0">
            Pricing
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
const Header: Component = () => {
  const [menuOpened, setMenuOpened] = createSignal(false);
  const [containerRef, setContainerRef] = createSignal<HTMLElement | null>(null);
  const containerHeight = (): number => {
    if (containerRef()) {
      return containerRef()!.scrollHeight;
    }

    return 0;
  };

  return (
    <div class="fixed top-0 left-0 z-50 flex items-center justify-center w-screen">
      <div class="max-w-3xl xl:max-w-4xl w-full flex p-0 pl-3 md:mt-2">
        <div class="flex items-center justify-start">
          <IconButton
            path={logoIcon}
            color="primary"
            link="/"
            class="bg-gradient-to-tr from-red-500 to-orange-500 m-0 mr-1"
          />
          <span class="flex-1 text-2xl font-extrabold text-gray-600 dark:text-gray-200">rite</span>
        </div>
        <div class="flex justify-center items-center w-full p-3">
          <div class="gap-1 hidden md:flex">
            <Button link="https://docs.vrite.io" variant="text" class="m-0 hover:underline-dashed">
              Documentation
            </Button>
            <Button link="/pricing" variant="text" class="m-0">
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
              class="m-0"
              target="_blank"
              path={mdiGithub}
              label="Star on GitHub"
            />
            <Button color="primary" link="https://app.vrite.io" class="m-0">
              Sign in
            </Button>
          </div>
          <IconButton
            path={menuOpened() ? mdiClose : mdiMenu}
            class="m-0 md:hidden"
            variant="text"
            aria-label="Menu"
            onClick={() => {
              setMenuOpened(!menuOpened());
            }}
          />
        </div>
      </div>
      <div
        class="max-w-3xl xl:max-w-4xl md:rounded-2xl -z-1 gap-1 !md:h-14 absolute pt-14 top-0 md:top-2 text-center w-full flex flex-col overflow-hidden backdrop-blur-md bg-gray-50 dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 transition-all duration-500 ease-in-out"
        style={{
          height: menuOpened() ? `calc(${containerHeight()}px + 3.5rem)` : "3.5rem"
        }}
      >
        <div
          class={clsx(
            "flex flex-col p-4 gap-1 transition-opacity duration-500 ease-in-out",
            !menuOpened() && "opacity-0"
          )}
          ref={setContainerRef}
        >
          <Button link="https://docs.vrite.io" variant="text" class="m-0 hover:underline-dashed">
            Documentation
          </Button>
          <Button link="/pricing" variant="text" class="m-0">
            Pricing
          </Button>
          <Button link="/blog" variant="text" class="m-0">
            Blog
          </Button>
          <IconButton
            link="https://github.com/vriteio/vrite"
            variant="text"
            class="m-0"
            target="_blank"
            path={mdiGithub}
            label="Star on GitHub"
          />
          <Button color="primary" link="https://app.vrite.io" class="m-0">
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
};

export { Header };
