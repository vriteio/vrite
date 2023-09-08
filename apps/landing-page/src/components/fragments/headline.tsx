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
import dashboardImageDark from "#assets/images/dark/dashboard.png";
import dashboardImageLight from "#assets/images/light/dashboard.png";
import { Button, IconButton, Input, Loader, Image } from "#components/primitives";
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
      outOfViewClass="invisible translate-y-full"
    >
      <Observed
        class="delay-100 transition-all hero-image duration-1000 ease-out max-h-full -z-10 md:absolute right-0 -top-16 max-w-[calc(100vw-4rem)] shadow-2xl rounded-2xl border-2 border-gray-200 dark:border-gray-700 gradient-image-mask overflow-hidden"
        outOfViewClass="invisible hero-image-initial"
      >
        <Image
          // class="max-h-full -z-10 md:absolute right-0 hero-image -top-16 max-w-[calc(100vw-4rem)] shadow-2xl rounded-2xl border-2 border-gray-200 dark:border-gray-700 gradient-image-mask overflow-hidden"
          class="h-full w-full"
          srcDark={dashboardImageDark.src}
          srcLight={dashboardImageLight.src}
          alt="Vrite Kanban dashboard"
        ></Image>
      </Observed>
      <div class="flex justify-center items-center flex-col bg-opacity-40 bg-gray-100 dark:bg-gray-800 dark:bg-opacity-40 shadow-2xl shadow-gray-100 dark:shadow-gray-800">
        <div>
          <Button badge text="soft" class="font-semibold text-center">
            Public Beta
          </Button>
        </div>
        <h1 class="text-7xl md:text-9xl text-center !font-bold" style={{ perspective: "600px" }}>
          Developer
          <br />
          <span class="bg-clip-text text-transparent bg-gradient-to-tr">Content Platform</span>
        </h1>
        <p class="max-w-2xl mt-4 text-2xl md:text-3xl text-center">
          Open-source, collaborative space to create, manage and deploy product documentation,
          technical blogs, and knowledge bases.
        </p>
        <div class="items-center justify-center hidden w-full mt-4 gap-4 md:flex">
          <IconButton
            color="primary"
            class="flex items-center justify-center m-0 whitespace-nowrap"
            size="large"
            link="https://app.vrite.io"
            path={mdiLoginVariant}
            label="Get started"
            target="_blank"
          />
          <IconButton
            class="flex items-center justify-center m-0 whitespace-nowrap"
            link="https://docs.vrite.io"
            text="soft"
            size="large"
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
