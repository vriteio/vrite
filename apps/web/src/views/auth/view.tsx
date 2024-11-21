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
import {
  mdiGithub,
  mdiEmail,
  mdiFormTextboxPassword,
  mdiLightbulb,
  mdiLightbulbOutline
} from "@mdi/js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { A, useNavigate } from "@solidjs/router";
import { Card, Icon, IconButton, Tooltip } from "#components/primitives";
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
type Circle = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  color: number[];
};

const AnimatedGradient = () => {
  const [canvasRef, setCanvasRef] = createRef<HTMLCanvasElement | null>(null);
  const colors = ["#ef4444", "#ffa166"];
  const primaryColor = [239, 68, 68];
  const secondaryColor = [255, 161, 102];
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };
  const drawCircle = (ctx: CanvasRenderingContext2D, circle: Circle) => {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = `rgb(${circle.color.join(",")})`;
    ctx.fill();
    ctx.closePath();
  };

  onMount(() => {
    const canvas = canvasRef();
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    const circleCount = canvas.clientWidth / 100;
    const radius = canvas.clientWidth / 4;
    const circles: Circle[] = [];

    for (let i = 0; i < circleCount; i++) {
      const radius = randomInRange(canvas.clientWidth / 7, canvas.clientWidth / 4);
      const x = randomInRange(0, canvas.clientWidth - radius);
      const y = randomInRange(0, canvas.clientHeight - radius);
      const dx = randomInRange(canvas.clientWidth / -400, canvas.clientWidth / 400);
      const dy = randomInRange(canvas.clientHeight / -400, canvas.clientHeight / 400);
      /* const color = [
        Math.floor(randomInRange(primaryColor[0], secondaryColor[0])),
        Math.floor(randomInRange(primaryColor[1], secondaryColor[1])),
        Math.floor(randomInRange(primaryColor[2], secondaryColor[2]))
      ];*/
      const color = Math.random() > 0.5 ? primaryColor : secondaryColor;

      circles.push({ x, y, dx, dy, radius, color });
    }

    const animate = (): void => {
      requestAnimationFrame(animate);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      circles.forEach((circle) => {
        circle.x += circle.dx;
        circle.y += circle.dy;

        if (circle.x + circle.radius > canvas.width || circle.x - circle.radius < 0) {
          circle.dx = -circle.dx;
        }

        if (circle.y + circle.radius > canvas.height || circle.y - circle.radius < 0) {
          circle.dy = -circle.dy;
        }

        circle.x = Math.min(Math.max(circle.x, circle.radius), canvas.width - circle.radius);
        circle.y = Math.min(Math.max(circle.y, circle.radius), canvas.height - circle.radius);
        drawCircle(ctx, circle);
      });
    };
    const resize = (): void => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    animate();
    resize();
    window.addEventListener("resize", resize);
  });

  return (
    <div class="bg-gradient-to-tr h-full w-full rounded-xl relative overflow-hidden">
      <canvas ref={setCanvasRef} class="h-full w-full"></canvas>
      <div class="h-full w-full absolute top-0 left-0 backdrop-blur-3xl flex justify-center items-center">
        <div class="flex items-center font-bold text-3xl top-4 left-4 absolute">
          <svg
            width="32px"
            height="32px"
            viewBox="0 0 52 52"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
          >
            <g id="Page-2" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <g id="Group-11">
                <rect id="Rectangle" x="0" y="0" width="52" height="52"></rect>
                <g id="Group-10" transform="translate(1.75, 0)" fill="#FFFFFF">
                  <circle id="Oval" cx="24" cy="6" r="6"></circle>
                  <circle id="Oval" cx="33" cy="24" r="6"></circle>
                  <circle id="Oval" cx="38" cy="38" r="6"></circle>
                  <circle id="Oval" cx="26" cy="38" r="5"></circle>
                  <circle id="Oval" cx="6" cy="46" r="6"></circle>
                  <polygon
                    id="Path-4"
                    fill-rule="nonzero"
                    points="29.3665631 3.31671843 38.3665631 21.3167184 27.6334369 26.6832816 18.6334369 8.68328157"
                  ></polygon>
                  <polygon
                    id="Path-5"
                    fill-rule="nonzero"
                    points="18.528471 3.53781194 29.471529 8.46218806 11.471529 48.4621881 0.528470969 43.5378119"
                  ></polygon>
                  <polygon
                    id="Path-6"
                    fill-rule="nonzero"
                    points="26 43 38 44 38 32 26 33"
                  ></polygon>
                </g>
              </g>
            </g>
          </svg>
          ndesine
        </div>
        <div class="max-w-lg flex gap-2">
          <Icon path={mdiLightbulbOutline} class="h-8 min-w-8" />
          <div class="flex flex-col">
            <div class="flex text-xl font-bold items-center">Did you know?</div>
            <div>
              <p>
                Andesine is a type of feldspar that is often used in jewelry. It is named after the
                Andes Mountains in South America, where it was first discovered.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
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
    <div class="flex h-full w-full">
      <div class="flex-1 p-3 max-w-5/12">
        <AnimatedGradient />
      </div>
      <div class="flex-1 relative">
        <div class="dots-background absolute" />
        <Show when={showForm()}>
          <div
            class="flex items-center justify-center h-[calc(100vh-2rem)]"
            ref={setFormContainerRef}
          >
            <div class="relative flex flex-col m-auto w-80">
              <div class="relative flex items-center justify-center w-full">
                <div class="flex items-center justify-center">
                  <span class="text-2xl font-medium">Welcome to Andesine</span>
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
                    Almost there! We've sent an email to <b>{formData.email}</b> to verify your
                    email address.
                  </p>
                  <p class="p-2 prose">
                    Click on the verification link in the email to complete the sign up. If you
                    don't see it, you might have to check your <b>spam folder</b>.
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
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export { AuthView };
export type { AuthFormComponent };
