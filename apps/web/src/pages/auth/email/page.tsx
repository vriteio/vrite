import { type Component, createEffect, createSignal, Match, onCleanup, Switch } from "solid-js";
import { Title } from "@solidjs/meta";
import { IconButton, Button, OTPInput, Input, Tooltip, createRef } from "@andesine/components";
import { createAsync, query, useSearchParams } from "@solidjs/router";
import { useNotify } from "#web/context/notifications";
import { authClient, client } from "#web/lib/api";
import { validateEmail } from "#web/lib/validation";
import { appendRedirectTo, normalizeRedirectTo, redirectAfterAuth } from "#web/lib/navigation";
import { createMutation } from "@tanstack/solid-query";

const verifyOTPTokenQuery = query(async (input: { token?: string }) => {
  if (!input.token) return null;

  return client.auth.verifyOTPToken({ token: input.token });
}, "verify-otp-token");
const OTP_RATE_LIMIT = { maxRequests: 3, windowSeconds: 60 };
const OTP_RESEND_DELAY = Math.ceil(OTP_RATE_LIMIT.windowSeconds / OTP_RATE_LIMIT.maxRequests);
const EmailPage: Component = () => {
  const notify = useNotify();
  const [searchParams] = useSearchParams();
  const [view, setView] = createSignal<"form" | "otp">("form");
  const [email, setEmail] = createSignal("");
  const [otp, setOTP] = createSignal("");
  const [otpResendSeconds, setOTPResendSeconds] = createSignal(0);
  const [otpThrottleInterval, setOTPThrottleInterval] = createRef(0);
  const throttlingOTP = () => otpResendSeconds() > 0;
  const throttleOTP = () => {
    if (otpThrottleInterval()) clearInterval(otpThrottleInterval());

    setOTPResendSeconds(OTP_RESEND_DELAY);
    setOTPThrottleInterval(
      window.setInterval(() => {
        setOTPResendSeconds((seconds) => {
          if (seconds > 1) return seconds - 1;

          clearInterval(otpThrottleInterval());
          setOTPThrottleInterval(0);
          return 0;
        });
      }, 1_000)
    );
  };
  const otpToken = () => `${searchParams.token || ""}`;
  const mode = () => (searchParams.mode === "sign-in" ? "sign-in" : "sign-up");
  const redirectTo = () =>
    normalizeRedirectTo(
      Array.isArray(searchParams.redirectTo) ? searchParams.redirectTo[0] : searchParams.redirectTo
    );
  const otpFilled = () => otp().length === 6;
  const verifyOTPTokenResult = createAsync(() => verifyOTPTokenQuery({ token: otpToken() }));
  const sendOTPMutation = createMutation(() => ({
    mutationFn: async (input: { email: string; mode: "sign-in" | "sign-up" }) => {
      // If the mode is sign in, only send OTP to verify the email, otherwise "sign-in" automatically creates an account if it doesn't exist (sign up)
      const type = input.mode === "sign-in" ? "email-verification" : "sign-in";
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: input.email,
        type
      });

      if (error) throw error;

      return true;
    }
  }));
  const verifyOTPMutation = createMutation(() => ({
    mutationFn: async (input: { email: string; otp: string; mode: "sign-in" | "sign-up" }) => {
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

      return true;
    }
  }));
  const handleSendOTP = async () => {
    if (!validateEmail(email()) || sendOTPMutation.isPending || verifyOTPMutation.isPending) return;

    try {
      await sendOTPMutation.mutateAsync({ email: email(), mode: mode() });

      setView("otp");
      throttleOTP();
    } catch {
      notify({ type: "error", text: "Couldn't continue with email" });
    }
  };
  const handleVerifyOTP = async () => {
    if (!otpFilled()) return;

    try {
      await verifyOTPMutation.mutateAsync({ email: email(), otp: otp(), mode: mode() });
      await redirectAfterAuth(redirectTo());
    } catch {
      notify({ type: "error", text: "Couldn't verify email" });
    }
  };
  const handleResendOTP = async () => {
    if (sendOTPMutation.isPending || verifyOTPMutation.isPending || throttlingOTP()) {
      return;
    }

    try {
      await sendOTPMutation.mutateAsync({ email: email(), mode: mode() });
      throttleOTP();
      notify({ type: "success", text: "Code resent" });
    } catch {
      notify({ type: "error", text: "Couldn't resend code" });
    }
  };

  createEffect(() => {
    if (otp().length === 6) {
      void handleVerifyOTP();
    }
  });

  onCleanup(() => {
    if (otpThrottleInterval()) clearInterval(otpThrottleInterval());
  });

  if (verifyOTPTokenResult()) {
    setView("otp");
    setEmail(verifyOTPTokenResult()!.email);
    setOTP(verifyOTPTokenResult()!.otp);
  }

  return (
    <div class="flex flex-col">
      <Title>{mode() === "sign-in" ? "Sign in" : "Sign up"} with email | Andesine</Title>
      <Switch>
        <Match when={view() === "form"}>
          <span class="text-2xl font-semibold">
            {mode() === "sign-in" ? "Welcome back!" : "Welcome!"}
          </span>
          <div class="text-gray-400 leading-5 text-sm">
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
                    disabled={!validateEmail(email()) || sendOTPMutation.isPending}
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
              <div class="flex flex-col items-start justify-center w-full transform -bottom-16 text-sm text-gray-400">
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
              <div class="flex flex-col items-start justify-center w-full transform text-sm text-gray-400">
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
          <div class="text-gray-400 leading-5 text-sm">
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
              loading={verifyOTPMutation.isPending}
              color="primary"
              disabled={!otpFilled()}
              class="w-full mt-1"
              onClick={handleVerifyOTP}
            >
              Continue
            </Button>
          </div>
          <div class="flex flex-col items-start justify-center w-full transform text-sm text-gray-400">
            <span>Didn't receive the code?</span>
            <div class="inline-flex -mt-1">
              <IconButton
                icon="i-lucide:rotate-cw"
                iconProps={{
                  class: "w-3.5 h-3.5"
                }}
                variant="text"
                text="primary"
                color="primary"
                size="small"
                label={() => (
                  <span>{throttlingOTP() ? `Resend in ${otpResendSeconds()}s` : "Resend"}</span>
                )}
                loading={sendOTPMutation.isPending}
                disabled={
                  sendOTPMutation.isPending || verifyOTPMutation.isPending || throttlingOTP()
                }
                onClick={handleResendOTP}
                hover="underline"
                class="flex-row-reverse gap-1 inline-flex font-medium px-0"
              />
            </div>
          </div>
        </Match>
      </Switch>
    </div>
  );
};

export default EmailPage;
