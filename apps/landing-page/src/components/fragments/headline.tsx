import { Observed } from "./observed";
import clsx from "clsx";
import { Component, createSignal } from "solid-js";
import {
  mdiBookOpen,
  mdiBookOpenBlankVariant,
  mdiBookOpenVariant,
  mdiGithub,
  mdiLoginVariant
} from "@mdi/js";
import { Button, IconButton, Input, Loader } from "#components/primitives";
import { isEmailCorrect, setEmail, setEmailModal, submitEmailForm, emailContext } from "#lib/email";

const EmailForm: Component = () => {
  const [processing, setProcessing] = createSignal(false);
  const handleSubmitEmailForm = async (): Promise<void> => {
    setProcessing(true);
    await submitEmailForm();
    setEmailModal(true);
    setProcessing(false);
  };

  return (
    <>
      <div class="items-center justify-start hidden w-full gap-2 mt-2 md:flex">
        <Input
          value={emailContext.email}
          setValue={(value) => setEmail(value)}
          placeholder="Email"
          class="w-72 !m-0"
          type="email"
          onEnter={handleSubmitEmailForm}
        />
        <Button
          color="primary"
          class="flex items-center justify-center m-0 h-9 w-18 whitespace-nowrap"
          disabled={!isEmailCorrect()}
          onClick={handleSubmitEmailForm}
        >
          <span class={clsx(processing() && "invisible")}>Sign up</span>
          {processing() && <Loader class="absolute" />}
        </Button>
      </div>
      <p class="text-gray-600 dark:text-gray-200 text-sm pl-1 pt-1 hidden md:flex">
        Be the first to know when Public Beta comes out!
      </p>
    </>
  );
};
const Headline: Component = () => {
  const [headline, setHeadline] = createSignal(0);

  setInterval(() => {
    setHeadline(() => {
      if (headline() === 2) {
        return 0;
      }

      return headline() + 1;
    });
  }, 2000);

  return (
    <Observed
      class="mt-4 transition-all duration-500 ease-out transform md:mt-0"
      outOfViewClass="invisible translate-x-full"
    >
      <div>
        <div class="flex justify-start">
          <Button badge text="soft" class="font-semibold text-center">
            Public Beta
          </Button>
        </div>
        <h1 class="text-6xl md:text-7xl" style={{ perspective: "600px" }}>
          <div
            style={{
              "transform-style": "preserve-3d",
              "transition": "transform .33s",
              "transform": `translateZ(-60px) rotateX(${-90 + headline() * 90}deg)`
            }}
            class="h-15 md:h-18 w-[250px] relative font-extrabold"
          >
            <div
              class="absolute h-15 md:h-18 w-full"
              style={{
                "transform": "rotateX(90deg) translateZ(60px)",
                "backface-visibility": "hidden"
              }}
            >
              <span class="bg-clip-text text-transparent bg-gradient-to-tr">Create</span>
            </div>
            <div
              class="absolute h-15 md:h-18 w-full"
              style={{
                "transform": "rotateY(0deg) translateZ(60px)",
                "backface-visibility": "hidden"
              }}
            >
              <span class="bg-clip-text text-transparent bg-gradient-to-tr">Manage</span>
            </div>
            <div
              class="absolute h-15 md:h-18 w-full"
              style={{
                "transform": "rotateX(-90deg) translateZ(60px)",
                "backface-visibility": "hidden"
              }}
            >
              <span class="bg-clip-text text-transparent bg-gradient-to-tr">Deliver</span>
            </div>
          </div>
          <span class="font-bold">technical content</span>
        </h1>
        <p class="max-w-md mt-4 text-lg md:text-xl">
          Open-source <b>headless Content Management System (CMS)</b> for your programming blogs,
          documentation, and more.
        </p>
        <div class="items-center justify-start hidden w-full mt-4 gap-2 md:flex">
          <IconButton
            color="primary"
            text="base"
            class="flex items-center justify-center m-0 whitespace-nowrap p-1 px-1.5"
            size="large"
            variant="text"
            link="https://app.vrite.io"
            path={mdiLoginVariant}
            label="Get started"
            target="_blank"
          />
          <IconButton
            class="flex items-center justify-center m-0 whitespace-nowrap p-1 px-1.5"
            link="https://docs.vrite.io"
            text="soft"
            size="large"
            variant="text"
            path={mdiBookOpenBlankVariant}
            label="Documentation"
            target="_blank"
          />
        </div>
      </div>
    </Observed>
  );
};

export { Headline, EmailForm };
