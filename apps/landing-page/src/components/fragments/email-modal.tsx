import { mdiClose } from "@mdi/js";
import clsx from "clsx";
import { Component, createSignal, Show } from "solid-js";
import { IconButton, Button, Card, Input, Loader, Overlay } from "#components/primitives";
import { emailContext, setEmailModal, isEmailCorrect, setEmail, submitEmailForm } from "#lib/email";

const EmailModal: Component = () => {
  const [processing, setProcessing] = createSignal(false);
  const handleSubmitEmailForm = async (): Promise<void> => {
    setProcessing(true);
    await submitEmailForm();
    setProcessing(false);
  };

  return (
    <Overlay opened={emailContext.modalOpened} onOverlayClick={() => setEmailModal(false, false)}>
      <Card class="max-w-sm p-4 m-4 md:p-8 relative gap-2 flex flex-col bg-white dark:bg-gray-900">
        <div class="flex justify-center items-center">
          <h2 class={clsx("text-xl md:text-2xl flex-1 text-gray-700 dark:text-gray-100")}>
            {emailContext.success ? "Success" : "Sign up"}
          </h2>
          <IconButton
            path={mdiClose}
            text="soft"
            class="m-0"
            onClick={() => setEmailModal(false, false)}
          />
        </div>
        <Show
          when={!emailContext.success}
          fallback={
            <p class="text-gray-600 dark:text-gray-200">
              Thanks for signing up! We'll send you an invite soon.
            </p>
          }
        >
          <p class="text-gray-600 dark:text-gray-200 mb-4">
            Sign up to be the first to know when the Vrite Public Beta comes out and stay in the
            loop with Vrite development!
          </p>
          <Input
            value={emailContext.email}
            setValue={(value) => setEmail(value)}
            placeholder="Email"
            wrapperClass="flex-1 w-full md:w-auto"
            class="m-0 h-11 text-lg text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-800"
            type="email"
            onEnter={handleSubmitEmailForm}
          />
          <Button
            class="flex items-center justify-center m-0 whitespace-nowrap w-full md:w-auto"
            color="primary"
            disabled={!isEmailCorrect()}
            size="large"
            onClick={handleSubmitEmailForm}
          >
            <span class={clsx(processing() && "invisible")}>Submit</span>
            {processing() && <Loader class="absolute" />}
          </Button>
          <Show when={emailContext.error}>
            <span class="text-red-500 text-xs text-center">{emailContext.error}</span>
          </Show>
        </Show>
      </Card>
    </Overlay>
  );
};

export { EmailModal };
