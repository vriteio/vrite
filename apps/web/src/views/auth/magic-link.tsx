import { AuthFormComponent } from "./view";
import { getErrorMessage } from "./error-messages";
import { Show, createMemo } from "solid-js";
import { Input, Button } from "#components/primitives";
import { createRef, validateEmail } from "#lib/utils";
import { App, useClient } from "#context";

const MagicLinkForm: AuthFormComponent = (props) => {
  const client = useClient();
  const setLoading = (loading: boolean): void => props.setFormData("loading", loading);
  const loading = (): boolean => props.formData.loading;
  const [formContainerRef, setFormContainerRef] = createRef<HTMLElement | null>(null);
  const filled = createMemo(() => {
    return Boolean(props.formData.email && validateEmail(props.formData.email));
  });
  const submit = async (): Promise<void> => {
    try {
      await client.auth.sendMagicLink.mutate({ ...props.formData, redirect: props.redirect });
      setLoading(false);
      props.setFormData("formType", "magic-link-sent");
    } catch (error) {
      const clientError = error as App.ClientError;

      props.setFormData(
        "error",
        getErrorMessage(clientError.data.cause?.reason || clientError.data.cause?.code)
      );
      setLoading(false);
    }
  };
  const handleEnter = (event: KeyboardEvent): void => {
    const target = event.target as HTMLInputElement;
    const inputs = Array.from(formContainerRef()?.querySelectorAll("input") || []);
    const currentIndex = inputs.indexOf(target);

    if (currentIndex === inputs.length - 1) {
      if (filled()) {
        submit();
      } else {
        inputs[0].focus();
      }
    } else {
      inputs[currentIndex + 1].focus();
    }
  };

  return (
    <div ref={setFormContainerRef}>
      <p class="p-2 text-sm prose text-gray-500 dark:text-gray-400">
        Enter your email address and we'll send you a <b>magic link</b> to sign in to a matching
        account.
      </p>
      <Input
        placeholder="Email"
        type="email"
        autocomplete="email"
        value={props.formData.email}
        color="contrast"
        setValue={(value) => props.setFormData("email", value)}
        onEnter={handleEnter}
      />
      <Button
        color="primary"
        class="w-[calc(100%-0.5rem)]"
        disabled={!filled()}
        loading={loading()}
        onClick={submit}
      >
        Send magic link
      </Button>
      <div class="flex-col items-center justify-start px-2">
        <span class="text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
          Or continue with:
        </span>
        <div class="flex gap-1">{props.footer}</div>
      </div>
      <div class="flex-col absolute left-0 flex items-center justify-center w-full m-0 transform -bottom-8">
        <Button
          variant="text"
          text="soft"
          size="small"
          onClick={() => {
            props.setFormData("formType", "register");
          }}
        >
          I don't have an account
        </Button>
      </div>
    </div>
  );
};

export { MagicLinkForm };
