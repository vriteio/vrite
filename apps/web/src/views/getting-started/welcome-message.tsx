import { Component, createSignal } from "solid-js";
import { logoIcon } from "#assets/icons";
import { Overlay, Card, IconButton, Button } from "#components/primitives";

const WelcomeMessage: Component = () => {
  const [opened, setOpened] = createSignal(true);

  return (
    <Overlay opened={opened()} onOverlayClick={() => setOpened(false)}>
      <Card class="flex flex-col items-start justify-center w-full max-w-lg p-3 prose">
        <div class="flex items-center justify-center w-full">
          <IconButton
            path={logoIcon}
            color="primary"
            class="w-16 h-16 m-0 bg-gradient-to-tr rounded-2xl"
            iconProps={{ class: "h-12 w-12" }}
            badge
          />
        </div>
        <h2 class="w-full my-2 text-center">Welcome to Vrite!</h2>
        <p class="my-2">
          Thanks for being part of the <b>Vrite Beta</b> program.
        </p>
        <p class="my-2">
          With Vrite, we hope to create a different kind of headless CMS - one focused on{" "}
          <b>user experience</b> and producing <b>technical content</b>. This Beta, while early, is
          the first step to bringing that vision to life.
        </p>
        <p class="my-2">
          In case you need <b>help</b>, use the button in the <b>bottom-right corner</b> to access
          help center, or chat with the team. You can also reach out directly through the{" "}
          <a href="https://discord.gg/4Z5MdEffBn" target="_blank">
            Discord server
          </a>{" "}
          or the chat in the dashboard.
        </p>
        <div class="flex items-center justify-center w-full mt-4">
          <Button
            class="w-full m-0"
            color="primary"
            onClick={() => {
              setOpened(false);
            }}
          >
            Get started
          </Button>
        </div>
      </Card>
    </Overlay>
  );
};

export { WelcomeMessage };
