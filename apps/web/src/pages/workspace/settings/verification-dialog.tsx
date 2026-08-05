import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { authClient } from "#web/lib/api";
import {
  Button,
  Card,
  createRef,
  IconButton,
  OTPInput,
  Overlay,
  Skeleton,
  Tooltip
} from "@andesine/components";
import { createAsync } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { getPasskeyErrorMessage } from "#web/lib/validation";
import clsx from "clsx";
import {
  type Component,
  createEffect,
  createSignal,
  Match,
  on,
  onCleanup,
  Show,
  Switch
} from "solid-js";
import { useSettings } from "./settings-context";
import { passkeysQuery } from "#web/lib/data";

interface VerificationDialogOTPViewProps {
  resendingOTP: boolean;
  throttlingOTP: boolean;
  onVerified(): void;
  onBack(): void;
  onResendOTP(): Promise<boolean>;
}
const VerificationDialogOTPView: Component<VerificationDialogOTPViewProps> = (props) => {
  const { currentSession } = useWorkspace();
  const notify = useNotify();
  const [otp, setOTP] = createSignal("");
  const [lastSubmittedOTP, setLastSubmittedOTP] = createSignal("");
  const email = () => currentSession()?.user.email || "";
  const verifyOTPMutation = createMutation(() => ({
    mutationFn: async () => {
      const { error } = await authClient.signIn.emailOtp({
        email: email(),
        otp: otp()
      });

      if (error) throw error;

      return true;
    },
    onSuccess: () => {
      props.onVerified();
    },
    onError: (error) => {
      console.error(error);
      notify({ type: "error", text: "Couldn't verify the code" });
    }
  }));
  const verifyOTP = () => {
    const code = otp();

    if (code.length !== 6 || code === lastSubmittedOTP() || verifyOTPMutation.isPending) return;

    setLastSubmittedOTP(code);
    verifyOTPMutation.mutate();
  };

  createEffect(on(otp, verifyOTP));

  return (
    <>
      <div class="flex flex-col gap-0.5">
        <h3 class="text-lg font-semibold leading-tight">Check your email</h3>
        <p class="text-sm leading-tight text-gray-400 dark:text-gray-500">
          Enter the six-digit code sent to <br />
          <span class="font-medium bg-gradient-to-tr bg-clip-text text-transparent">{email()}</span>
        </p>
      </div>
      <div class="flex flex-col gap-2.5">
        <OTPInput
          value={otp()}
          setValue={setOTP}
          onEnter={verifyOTP}
          color="contrast"
          variant="outlined"
        />
        <div class="flex gap-2">
          <Tooltip content="Go back">
            <IconButton
              variant="outlined"
              color="contrast"
              text="soft"
              size="small"
              icon="i-lucide:chevron-left"
              onClick={props.onBack}
            />
          </Tooltip>
          <Button
            color="primary"
            variant="outlined"
            class="w-full"
            size="small"
            loading={verifyOTPMutation.isPending}
            disabled={otp().length !== 6 || otp() === lastSubmittedOTP()}
            onClick={verifyOTP}
          >
            Verify and continue
          </Button>
        </div>
      </div>
      <div class="flex flex-col items-start justify-center w-full text-sm text-gray-400 dark:text-gray-500">
        <span>Didn't receive the code?</span>
        <div class="relative inline-flex -my-1">
          <IconButton
            icon="i-lucide:rotate-cw"
            iconProps={{ class: "h-3.5 w-3.5" }}
            variant="text"
            text="primary"
            color="primary"
            size="small"
            hover="underline"
            class="flex-row-reverse gap-1 inline-flex font-medium px-0"
            label={() => <span>Resend</span>}
            loading={props.resendingOTP}
            disabled={props.resendingOTP || verifyOTPMutation.isPending || props.throttlingOTP}
            onClick={async () => {
              if (await props.onResendOTP()) {
                setOTP("");
                setLastSubmittedOTP("");
              }
            }}
          />
          <Show when={props.throttlingOTP}>
            <Skeleton class="absolute inset-0 rounded-lg" />
          </Show>
        </div>
      </div>
    </>
  );
};
const VerificationDialog: Component = () => {
  const notify = useNotify();
  const { currentSession } = useWorkspace();
  const { closeVerificationDialog, onVerified, verificationDialogOpened } = useSettings();
  const passkeys = createAsync(() => passkeysQuery(), { initialValue: [] });
  const [view, setView] = createSignal<"methods" | "otp">("methods");
  const [throttlingOTP, setThrottlingOTP] = createSignal(false);
  const [otpThrottleTimeout, setOTPThrottleTimeout] = createRef(0);
  const throttleOTP = () => {
    if (otpThrottleTimeout()) clearTimeout(otpThrottleTimeout());

    setThrottlingOTP(true);
    setOTPThrottleTimeout(
      window.setTimeout(() => {
        setThrottlingOTP(false);
        setOTPThrottleTimeout(0);
      }, 5_000)
    );
  };
  const email = () => currentSession()?.user.email || "";
  const hasPasskey = () => (passkeys() ?? []).length > 0;
  let passkeyStartedAt = 0;
  const passkeyMutation = createMutation(() => ({
    mutationFn: async () => {
      passkeyStartedAt = Date.now();
      const { error } = await authClient.signIn.passkey();

      if (error) throw error;

      return true;
    },
    onSuccess: () => {
      onVerified();
    },
    onError: (error) => {
      console.error(error);
      notify({
        type: "error",
        text: getPasskeyErrorMessage(error, "verify", Date.now() - passkeyStartedAt)
      });
    }
  }));
  const sendOTPMutation = createMutation(() => ({
    mutationFn: async () => {
      const { error } = await authClient.emailOtp.sendVerificationOtp(
        {
          email: email(),
          type: "sign-in"
        },
        {
          headers: {
            "x-session-verification": "true",
            "x-session-verification-callback": window.location.pathname
          }
        }
      );

      if (error) throw error;

      return true;
    },
    onSuccess: () => {
      setView("otp");
      throttleOTP();
    },
    onError: (error) => {
      console.error(error);
      notify({ type: "error", text: "Couldn't send the verification email" });
    }
  }));

  createEffect(
    on(verificationDialogOpened, (opened) => {
      if (!opened) setView("methods");
    })
  );

  onCleanup(() => {
    if (otpThrottleTimeout()) clearTimeout(otpThrottleTimeout());
  });

  return (
    <Overlay opened={verificationDialogOpened()} onOverlayClick={closeVerificationDialog} portal>
      <Card color="contrast" class="p-1.5">
        <Card class="flex w-sm flex-col gap-4 rounded-xl p-4 relative" shade>
          <Tooltip content="Close" wrapperClass="absolute right-2 top-2" side="left">
            <IconButton
              variant="text"
              text="soft"
              size="small"
              icon="i-lucide:x"
              onClick={closeVerificationDialog}
            />
          </Tooltip>
          <Switch>
            <Match when={view() === "methods"}>
              <div class="flex flex-col gap-0.5">
                <h3 class="text-lg font-semibold leading-tight">Verification required</h3>
                <p class="text-sm leading-tight text-gray-400 dark:text-gray-500">
                  To change sensitive security settings, verify your identity using one of the
                  methods below
                </p>
              </div>
              <div class="flex flex-col gap-1">
                <Show when={hasPasskey()}>
                  <IconButton
                    icon="i-lucide:fingerprint"
                    iconProps={{ class: "h-4 w-4" }}
                    size="small"
                    class="w-full"
                    variant="outlined"
                    color="primary"
                    label={passkeyMutation.isPending ? "Verifying..." : "Verify with passkey"}
                    loading={passkeyMutation.isPending}
                    disabled={sendOTPMutation.isPending}
                    onClick={() => passkeyMutation.mutate()}
                  />
                  <div class="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                    Or
                    <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  </div>
                </Show>
                <IconButton
                  icon="i-lucide:mail"
                  iconProps={{
                    class: clsx("h-4 w-4", hasPasskey() && "text-gray-400 dark:text-gray-500")
                  }}
                  size="small"
                  class="w-full"
                  variant="outlined"
                  color={hasPasskey() ? "contrast" : "primary"}
                  label={sendOTPMutation.isPending ? "Sending code..." : "Send verification code"}
                  loading={sendOTPMutation.isPending}
                  disabled={!email() || passkeyMutation.isPending}
                  onClick={() => sendOTPMutation.mutate()}
                />
              </div>
            </Match>
            <Match when={view() === "otp"}>
              <VerificationDialogOTPView
                resendingOTP={sendOTPMutation.isPending}
                throttlingOTP={throttlingOTP()}
                onVerified={() => {
                  onVerified();
                }}
                onBack={() => setView("methods")}
                onResendOTP={async () => {
                  if (throttlingOTP()) return false;

                  try {
                    await sendOTPMutation.mutateAsync();

                    return true;
                  } catch {
                    return false;
                  }
                }}
              />
            </Match>
          </Switch>
        </Card>
      </Card>
    </Overlay>
  );
};

export { VerificationDialog };
