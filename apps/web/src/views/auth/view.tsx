import { PasswordForm } from "./password";
import { MagicLinkForm } from "./magic-link";
import { getErrorMessage } from "./error-messages";
import {
  Component,
  createEffect,
  createSignal,
  JSX,
  Match,
  on,
  onMount,
  Show,
  Switch
} from "solid-js";
import { mdiGithub, mdiEmail, mdiFormTextboxPassword } from "@mdi/js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { useNavigate } from "@solidjs/router";
import { Card, IconButton, Tooltip } from "#components/primitives";
import { createRef, validateEmail, validateRedirectURL } from "#lib/utils";
import { useClient, useHostConfig } from "#context";
import { logoIcon } from "#assets/icons";

type AuthForm = "login" | "register" | "verify-email" | "magic-link" | "magic-link-sent";

interface AuthFormData {
  formType: AuthForm;
  password: string;
  username: string;
  email: string;
  error: JSX.Element;
  loading: boolean;
}
interface AuthFormComponentProps {
  footer: JSX.Element;
  formData: AuthFormData;
  redirect?: string;
  plan?: string;
  setFormData: SetStoreFunction<AuthFormData>;
  onRegister?: () => Promise<void>;
}

type AuthFormComponent = Component<AuthFormComponentProps>;

declare global {
  interface Window {
    gtag?: (
      type: string,
      event: string,
      options: { send_to: string; event_callback: () => void }
    ) => void;
  }
}

const AuthView: Component = () => {
  const hostConfig = useHostConfig();
  const client = useClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = createSignal(false);
  const initialError = new URL(location.href).searchParams.get("error");
  const redirectParam = new URL(location.href).searchParams.get("redirect") || "/";
  const redirect = validateRedirectURL(redirectParam) ? redirectParam : "/";
  const plan = new URL(location.href).searchParams.get("plan") || "personal";
  const [formData, setFormData] = createStore<AuthFormData>({
    password: "",
    email: "",
    username: "",
    formType: "login",
    loading: false,
    error: initialError ? getErrorMessage(initialError) : ""
  });
  const [formContainerRef, setFormContainerRef] = createRef<HTMLElement | null>(null);
  const checkIfLoggedIn = async (): Promise<void> => {
    try {
      const { isSignedIn } = await client.auth.isSignedIn.query();

      if (isSignedIn) {
        navigate("/");
      } else {
        setShowForm(true);
      }
    } catch (error) {
      setShowForm(true);
    }
  };
  const trackConversion = async (): Promise<void> => {
    let conversionCallback: () => void = () => {};

    const registeredConversion = new Promise<void>((resolve) => {
      conversionCallback = resolve;
    });

    window.gtag?.("event", "conversion", {
      send_to: "AW-16595937003/5SD4CLf_vLcZEOvNx-k9",
      event_callback: conversionCallback
    });

    if (!window.gtag) {
      conversionCallback();
    }

    await registeredConversion;
  };
  const continueWithGitHub = async (): Promise<void> => {
    setFormData("loading", true);
    await trackConversion();
    window.location.replace(`/login/github?plan=${plan}`);
  };

  onMount(() => {
    const formContainer = formContainerRef();

    if (!formContainer) return;
  });
  createEffect(
    on(
      [
        () => formData.username,
        () => formData.email,
        () => formData.password,
        () => formData.formType
      ],
      ([username, email, password]) => {
        if (formData.error && (username || email || password)) {
          setFormData("error", validateEmail(email) ? "" : getErrorMessage("invalidEmail"));

          const searchParams = new URLSearchParams(window.location.search);

          searchParams.delete("error");
          history.pushState(null, "", `${window.location.pathname}?${searchParams.toString()}`);
        }
      }
    )
  );
  checkIfLoggedIn();

  return (
    <Show when={showForm()}>
      <div class="flex items-center justify-center h-[calc(100vh-2rem)]" ref={setFormContainerRef}>
        <Card class="relative flex flex-col m-auto w-80">
          <div class="relative flex items-center justify-center w-full">
            <div class="flex items-center justify-center">
              <IconButton path={logoIcon} color="primary" badge class="bg-gradient-to-tr" />
              <span class="text-2xl font-black">rite</span>
            </div>
          </div>
          <span class="text-sm text-center text-red-500">{formData.error}</span>
          <Switch>
            <Match when={["login", "register"].includes(formData.formType)}>
              <PasswordForm
                formData={formData}
                setFormData={setFormData}
                redirect={redirect}
                plan={plan}
                onRegister={() => {
                  return trackConversion();
                }}
                footer={
                  <>
                    <Show when={hostConfig.githubOAuth}>
                      <Tooltip
                        text="GitHub"
                        enabled={formData.formType !== "register"}
                        class="mt-1"
                      >
                        <IconButton
                          path={mdiGithub}
                          text="soft"
                          variant="text"
                          label={formData.formType === "register" ? "GitHub" : ""}
                          class="m-0"
                          onClick={continueWithGitHub}
                        />
                      </Tooltip>
                    </Show>
                    <Show when={formData.formType !== "register"}>
                      <Tooltip text="Magic link" class="mt-1">
                        <IconButton
                          path={mdiEmail}
                          text="soft"
                          variant="text"
                          class="m-0"
                          onClick={() => {
                            setFormData("formType", "magic-link");
                          }}
                        />
                      </Tooltip>
                    </Show>
                  </>
                }
              />
            </Match>
            <Match when={formData.formType === "verify-email"}>
              <p class="p-2 prose">
                Almost there! We've sent an email to <b>{formData.email}</b> to verify your email
                address.
              </p>
              <p class="p-2 prose">
                Click on the verification link in the email to complete the sign up. If you don't
                see it, you might have to check your <b>spam folder</b>.
              </p>
            </Match>
            <Match when={formData.formType === "magic-link"}>
              <MagicLinkForm
                formData={formData}
                setFormData={setFormData}
                redirect={redirect}
                footer={
                  <>
                    <Show when={hostConfig.githubOAuth}>
                      <Tooltip text="GitHub" class="mt-1">
                        <IconButton
                          path={mdiGithub}
                          text="soft"
                          variant="text"
                          class="m-0"
                          onClick={continueWithGitHub}
                        />
                      </Tooltip>
                    </Show>
                    <Tooltip text="Password login" class="mt-1">
                      <IconButton
                        path={mdiFormTextboxPassword}
                        text="soft"
                        variant="text"
                        class="m-0"
                        onClick={() => {
                          setFormData("formType", "login");
                        }}
                      />
                    </Tooltip>
                  </>
                }
              />
            </Match>
            <Match when={formData.formType === "magic-link-sent"}>
              <p class="p-2 prose">
                We've sent a magic link to <b>{formData.email}</b> for you to sign in.
              </p>
              <p class="p-2 prose">
                If you don't see it, you might have to check your <b>spam folder</b>.
              </p>
            </Match>
          </Switch>
        </Card>
      </div>
    </Show>
  );
};

export { AuthView };
export type { AuthFormComponent };
