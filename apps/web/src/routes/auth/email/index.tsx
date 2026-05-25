import { Component, createEffect, createSignal, Match, Switch } from "solid-js";
import { IconButton, Button, OTPInput, Input, Tooltip } from "@andesine/components";
import {
  action,
  createAsync,
  query,
  redirect,
  useAction,
  useSearchParams,
  useSubmission
} from "@solidjs/router";
import { useNotify } from "#web/context/notifications";
import { authClient, client } from "#web/lib/client";
import { validateEmail } from "#web/lib/validate";
import { appendRedirectTo, normalizeRedirectTo } from "#web/lib/auth-redirect";

const verifyOTPTokenQuery = query(async (input: { token?: string }) => {
  if (!input.token) return null;

  return client.auth.verifyOTPToken({ token: input.token });
}, "verify-otp-token");
const sendOTPAction = action(async (input: { email: string; mode: "sign-in" | "sign-up" }) => {
  // If the mode is sign in, only send OTP to verify the email, otherwise "sign-in" automatically creates an account if it doesn't exist (sign up)
  const type = input.mode === "sign-in" ? "email-verification" : "sign-in";
  const { error } = await authClient.emailOtp.sendVerificationOtp({
    email: input.email,
    type
  });

  if (error) throw error;

  return true;
});
const verifyOTPAction = action(
  async (input: {
    email: string;
    otp: string;
    mode: "sign-in" | "sign-up";
    redirectTo?: string | null;
  }) => {
    if (input.mode === "sign-in") {
      // Just verify email and sign the user in if it exists.
      const { error } = await authClient.emailOtp.verifyEmail({
        email: input.email,
        otp: input.otp
      });

      if (error) throw error;
    } else {
      // Auto-creates an account if it doesn't exist (sign up)
      const { error } = await authClient.signIn.emailOtp({
        email: input.email,
        otp: input.otp
      });

      if (error) throw error;
    }

    return redirect(normalizeRedirectTo(input.redirectTo) || "/");
  }
);
const EmailPage: Component = () => {
  const notify = useNotify();
  const [searchParams] = useSearchParams();
  const [view, setView] = createSignal<"form" | "otp">("form");
  const [email, setEmail] = createSignal("");
  const [otp, setOTP] = createSignal("");
  const otpToken = () => `${searchParams.token || ""}`;
  const mode = () => (searchParams.mode === "sign-in" ? "sign-in" : "sign-up");
  const redirectTo = () =>
    normalizeRedirectTo(
      Array.isArray(searchParams.redirectTo) ? searchParams.redirectTo[0] : searchParams.redirectTo
    );
  const otpFilled = () => otp().length === 6;
  const verifyOTPTokenResult = createAsync(() => {
    return verifyOTPTokenQuery({ token: otpToken() });
  });
  const sendOTP = useAction(sendOTPAction);
  const verifyOTP = useAction(verifyOTPAction);
  const sendOTPSubmission = useSubmission(sendOTPAction);
  const verifyOTPSubmission = useSubmission(verifyOTPAction);
  const handleSendOTP = async () => {
    if (!validateEmail(email()) || verifyOTPSubmission.pending) return;

    try {
      await sendOTP({ email: email(), mode: mode() });

      setView("otp");
    } catch (error) {
      notify({ type: "error", text: "Couldn't continue with email" });
    }
  };
  const handleVerifyOTP = async () => {
    if (!otpFilled()) return;

    try {
      await verifyOTP({ email: email(), otp: otp(), mode: mode(), redirectTo: redirectTo() });
    } catch (error) {
      notify({ type: "error", text: "Couldn't verify email" });
    }
  };
  const handleResendOTP = async () => {
    try {
      await sendOTP({ email: email(), mode: mode() });
      notify({ type: "success", text: "Code resent" });
    } catch (error) {
      notify({ type: "error", text: "Couldn't resend code" });
    }
  };

  createEffect(() => {
    if (otp().length === 6) {
      handleVerifyOTP();
    }
  });

  if (verifyOTPTokenResult()) {
    setView("otp");
    setEmail(verifyOTPTokenResult()!.email);
    setOTP(verifyOTPTokenResult()!.otp);
  }

  return (
    <div class="flex flex-col">
      <Switch>
        <Match when={view() === "form"}>
          <span class="text-2xl font-semibold">
            {mode() === "sign-in" ? "Welcome back!" : "Welcome!"}
          </span>
          <div class="text-gray-400 dark:text-gray-500 leading-5 text-sm">
            Provide your email to continue, or <br />
            <Button
              variant="text"
              size="small"
              hover="underline"
              color="primary"
              class="px-0"
              link={appendRedirectTo(
                mode() === "sign-in" ? "/auth/sign-in" : "/auth/sign-up",
                redirectTo()
              )}
            >
              {mode() === "sign-in" ? "sign in with other methods" : "sign up with other methods"}
            </Button>
          </div>
          <div class="flex flex-col my-4 gap-2.5">
            <Input
              type="email"
              placeholder="name@email.com"
              autocomplete="email"
              value={email()}
              setValue={setEmail}
              onEnter={handleSendOTP}
              labelWrapperClass="flex"
              slotWrapperClass="gap-1.5"
              slot={() => (
                <Tooltip content="Continue">
                  <IconButton
                    disabled={!validateEmail(email()) || sendOTPSubmission.pending}
                    icon="i-lucide:arrow-right"
                    color="primary"
                    onClick={handleSendOTP}
                  />
                </Tooltip>
              )}
            />
          </div>
          <Switch>
            <Match when={mode() === "sign-in"}>
              <div class="flex flex-col items-start justify-center w-full transform -bottom-16 text-sm text-gray-400 dark:text-gray-500">
                <span>Don't have an account?</span>
                <IconButton
                  icon="i-lucide:arrow-right"
                  iconProps={{ class: "h-4 w-4" }}
                  variant="text"
                  text="primary"
                  color="primary"
                  size="small"
                  link={appendRedirectTo("/auth/sign-up", redirectTo())}
                  label={() => <span>Sign up</span>}
                  hover="underline"
                  class="flex-row-reverse gap-1 inline-flex font-medium px-0 -mt-1"
                ></IconButton>
              </div>
            </Match>
            <Match when={mode() === "sign-up"}>
              <div class="flex flex-col items-start justify-center w-full transform text-sm text-gray-400 dark:text-gray-500">
                <span>Already have an account?</span>
                <IconButton
                  icon="i-lucide:arrow-right"
                  variant="text"
                  text="primary"
                  color="primary"
                  size="small"
                  link={appendRedirectTo("/auth/sign-in", redirectTo())}
                  label={() => <span>Sign in</span>}
                  iconProps={{ class: "w-4 h-4" }}
                  hover="underline"
                  class="flex-row-reverse gap-1 inline-flex font-medium px-0 -mt-1"
                ></IconButton>
              </div>
            </Match>
          </Switch>
        </Match>
        <Match when={view() === "otp"}>
          <span class="text-2xl font-semibold">Almost there!</span>
          <div class="text-gray-400 dark:text-gray-500 leading-5 text-sm">
            {mode() === "sign-in"
              ? "To verify your sign request, enter the code sent to:"
              : "To complete registration, enter the code sent to:"}
            <br />
            <IconButton
              color="primary"
              text="primary"
              variant="text"
              hover="underline"
              size="small"
              class="flex-row-reverse gap-1 inline-flex px-0 -mt-1"
              icon="i-lucide:pencil"
              label={() => <span>{email()}</span>}
              iconProps={{ class: "h-4 w-4" }}
              onClick={() => {
                setView("form");
              }}
            ></IconButton>
          </div>
          <div class="flex flex-col my-4 gap-2.5">
            <OTPInput value={otp()} setValue={setOTP} onEnter={handleVerifyOTP} />
            <Button
              loading={verifyOTPSubmission.pending}
              color="primary"
              disabled={!otpFilled()}
              class="w-full mt-1"
              onClick={handleVerifyOTP}
            >
              Continue
            </Button>
          </div>
          <div class="flex flex-col items-start justify-center w-full transform text-sm text-gray-400 dark:text-gray-500">
            <span>Didn't receive the code?</span>
            <IconButton
              icon="i-lucide:rotate-cw"
              iconProps={{
                class: "w-4 h-4"
              }}
              variant="text"
              text="primary"
              color="primary"
              size="small"
              label={() => <span>Resend</span>}
              onClick={handleResendOTP}
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
