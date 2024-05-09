import { AuthFormComponent } from "./view";
import { getErrorMessage } from "./error-messages";
import { mdiEye, mdiEyeOff } from "@mdi/js";
import { Show, createSignal } from "solid-js";
import type { App } from "#context";
import { Input, Tooltip, IconButton, Button } from "#components/primitives";
import {
  createRef,
  navigateAndReload,
  validateEmail,
  validatePassword,
  validateUsername
} from "#lib/utils";
import { useClient } from "#context";

const PasswordForm: AuthFormComponent = (props) => {
  const client = useClient();
  const [hidePassword, setHidePassword] = createSignal(true);
  const [formContainerRef, setFormContainerRef] = createRef<HTMLElement | null>(null);
  const isRegisterForm = (): boolean => props.formData.formType === "register";
  const setLoading = (loading: boolean): void => props.setFormData("loading", loading);
  const loading = (): boolean => props.formData.loading;
  const filled = (): boolean => {
    if (!isRegisterForm()) {
      return Boolean(
        props.formData.email && props.formData.password && validateEmail(props.formData.email)
      );
    }

    return Boolean(
      props.formData.username &&
        props.formData.email &&
        props.formData.password &&
        validateUsername(props.formData.username) &&
        validateEmail(props.formData.email) &&
        validatePassword(props.formData.password)
    );
  };
  const login = async (): Promise<void> => {
    try {
      await client.auth.login.mutate(props.formData);
      navigateAndReload(props.redirect || "/");
      setLoading(false);
    } catch (error) {
      const clientError = error as App.ClientError;

      props.setFormData(
        "error",
        getErrorMessage(clientError.data.cause?.reason || clientError.data.cause?.code)
      );
      setLoading(false);
    }
  };
  const register = async (): Promise<void> => {
    try {
      await client.auth.register.mutate({
        ...props.formData,
        redirect: props.redirect,
        plan: props.plan
      });
      setLoading(false);
      props.setFormData("formType", "verify-email");
    } catch (error) {
      const clientError = error as App.ClientError;

      props.setFormData(
        "error",
        getErrorMessage(clientError.data.cause?.reason || clientError.data.cause?.code)
      );
      setLoading(false);
    }
  };
  const submit = async (): Promise<void> => {
    setLoading(true);

    if (!validateEmail(props.formData.email)) {
      props.setFormData("error", getErrorMessage("invalidEmail"));
      setLoading(false);

      return;
    }

    if (isRegisterForm()) {
      await register();
    } else {
      await login();
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
      <Show when={isRegisterForm()}>
        <p class="p-2 text-sm prose text-gray-500 dark:text-gray-400">
          By registering you agree to our{" "}
          <a href="https://vrite.io/privacy" target="_blank">
            privacy policy
          </a>{" "}
          and{" "}
          <a href="https://vrite.io/tos" target="_blank">
            terms of use
          </a>
          .
        </p>
      </Show>
      <Show when={isRegisterForm()}>
        <Input
          placeholder="Username"
          autocomplete="username"
          color="contrast"
          value={props.formData.username}
          setValue={(value) => props.setFormData("username", value)}
          onEnter={handleEnter}
        />
        <Show when={props.formData.username && !validateUsername(props.formData.username)}>
          <p class="px-2 text-xs prose text-red-500">
            Can only contain lowercase letters, numbers, and underscores.
          </p>
        </Show>
      </Show>
      <Input
        placeholder="Email"
        type="email"
        autocomplete="email"
        value={props.formData.email}
        color="contrast"
        setValue={(value) => props.setFormData("email", value)}
        onBlur={() => {
          if (props.formData.email && !validateEmail(props.formData.email)) {
            props.setFormData("error", getErrorMessage("invalidEmail"));
          }
        }}
        onEnter={handleEnter}
      />
      <Input
        placeholder="Password"
        type={hidePassword() ? "password" : "text"}
        value={props.formData.password}
        color="contrast"
        setValue={(value) => props.setFormData("password", value)}
        autocomplete={isRegisterForm() ? "new-password" : "current-password"}
        onEnter={handleEnter}
        adornment={() => {
          return (
            <Tooltip text={hidePassword() ? "Show password" : "Hide password"}>
              <IconButton
                path={hidePassword() ? mdiEye : mdiEyeOff}
                text="soft"
                color="contrast"
                onClick={() => {
                  setHidePassword(!hidePassword());
                }}
              />
            </Tooltip>
          );
        }}
      />
      <Show when={isRegisterForm()}>
        <Show when={props.formData.password && !validatePassword(props.formData.password)}>
          <p class="px-2 text-xs prose text-red-500">
            Min. 8 characters, including a number, and a lowercase letter.
          </p>
        </Show>
      </Show>
      <Button
        color="primary"
        disabled={!filled()}
        onClick={submit}
        class="w-[calc(100%-0.5rem)]"
        loading={loading()}
      >
        {isRegisterForm() ? "Register" : "Login"}
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
            props.setFormData("formType", isRegisterForm() ? "login" : "register");
          }}
        >
          {isRegisterForm() ? "I already have an account" : "I don't have an account"}
        </Button>
      </div>
    </div>
  );
};

export { PasswordForm };
