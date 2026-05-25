import { Component, createEffect, createSignal, Match, Switch } from "solid-js";
import { IconButton, Button, OTPInput, Input, Tooltip } from "#web/components/primitives";
import { useLocation, useNavigate } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { client } from "#web/lib/client";
import { useNotify } from "#web/context";
import { validateEmail } from "#web/lib/utils";

const EmailPage: Component = (props) => {
  const location = useLocation<{ email?: string }>();
  const navigate = useNavigate();
  const notify = useNotify();
  const [view, setView] = createSignal<"email" | "otp">("email");
  const [email, setEmail] = createSignal("");
  const [otp, setOTP] = createSignal("");
  const filled = () => {
    if (view() === "email") {
      return validateEmail(email());
    } else {
      return otp().length === 6;
    }
  };
  const resendCode = createMutation(() => ({
    mutationFn: async () => {
      // TODO: Implement resend code
    }
  }));
  const verifyEmail = createMutation(() => ({
    onError: () => {
      notify({ type: "error", text: "Couldn't verify email" });
    },
    onSuccess: () => {
      navigate("/");
    },
    mutationFn: async () => {
      const result = await client.auth["verify-email"].post({
        email: email(),
        otp: otp()
      });

      if (result.error) throw result.error;
    }
  }));
  const submit = (): void => {
    if (filled()) {
      if (view() === "email") {
        setView("otp");
      } else {
        verifyEmail.mutate();
      }
    }
  };

  createEffect(() => {
    const newEmail = location.state?.email || "";

    setView(newEmail ? "otp" : "email");
    setEmail(newEmail);
  });

  return (
    <div class="flex flex-col">
      <span class="text-2xl font-semibold">Sign up with email</span>
      <Switch>
        <Match when={view() === "email"}>
          <div class="text-gray-400 dark:text-gray-500 leading-5 text-sm">
            Provide your email address to continue, or <br />
            <Button
              variant="text"
              size="small"
              hover="underline"
              color="primary"
              class="px-0"
              link="/auth/sign-up"
            >
              go back to sign up
            </Button>
          </div>
          <div class="flex flex-col my-4 gap-2">
            <Input
              type="email"
              placeholder="name@email.com"
              autocomplete="email"
              value={email()}
              setValue={setEmail}
              onEnter={submit}
              labelWrapperClass="flex"
              adornmentWrapperClass="gap-1.5"
              adornment={() => (
                <Tooltip text="Continue">
                  <IconButton
                    disabled={!filled()}
                    icon="i-lucide:arrow-right"
                    color="primary"
                    onClick={submit}
                  />
                </Tooltip>
              )}
            />
          </div>
          <div class="flex flex-col items-start justify-center w-full transform text-sm text-gray-400 dark:text-gray-500">
            <span>Already have an account?</span>
            <IconButton
              icon="i-lucide:arrow-right"
              variant="text"
              text="primary"
              color="primary"
              size="small"
              link="/auth/sign-in"
              label={() => <span>Sign in</span>}
              iconProps={{ class: "w-4 h-4" }}
              hover="underline"
              class="flex-row-reverse gap-1 inline-flex font-medium px-0 -mt-1"
            ></IconButton>
          </div>
        </Match>
        <Match when={view() === "otp"}>
          <div class="text-gray-400 dark:text-gray-500 leading-5 text-sm">
            To verify your email, enter the code sent to:
            <br />
            <Button
              link={`mailto:${email()}`}
              color="primary"
              variant="text"
              hover="underline"
              size="small"
              class="px-0"
            >
              {email()}
            </Button>
          </div>
          <div class="flex flex-col my-4 gap-2">
            <OTPInput value={otp()} setValue={setOTP} onEnter={submit} />
            <Button
              loading={verifyEmail.isPending}
              color="primary"
              disabled={!filled()}
              class="w-full mt-1"
              onClick={submit}
            >
              Continue
            </Button>
          </div>
          <div class="flex flex-col items-start justify-center w-full transform text-sm text-gray-400 dark:text-gray-500">
            <span>Didn't receive the code?</span>
            <IconButton
              icon="i-lucide:rotate-cw"
              variant="text"
              text="primary"
              color="primary"
              size="small"
              label={() => <span>Resend</span>}
              onClick={() => {
                resendCode.mutate();
              }}
              hover="underline"
              class="flex-row-reverse gap-1 inline-flex font-medium px-0 -mt-1"
            ></IconButton>
          </div>
        </Match>
      </Switch>
    </div>
  );
};

export default EmailPage;
