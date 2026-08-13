import { Card, ScrollShadow, createRef } from "@andesine/components";
import { Title } from "@solidjs/meta";
import {
  revalidate,
  type RouteSectionProps,
  useLocation,
  useNavigate,
  useParams
} from "@solidjs/router";
import { type Component, createEffect, onCleanup, Show } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { useRouteData } from "#web/lib/navigation";
import { SettingsProvider } from "./settings-context";
import { VerificationDialog } from "./verification-dialog";

const SettingsLayout: Component<RouteSectionProps> = (props) => {
  const routeData = useRouteData();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string; keyID?: string }>();
  const { content, currentWorkspace, hasPermission, subscribeToUpdates } = useWorkspace();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const title = () => routeData()?.title || "Settings";
  const activeRoute = () => {
    return location.pathname
      .slice(`/${params.workspaceID || ""}/settings`.length)
      .split("/")
      .filter(Boolean)[0];
  };
  const canAccessRoute = () => {
    const route = activeRoute();

    if (!route || route === "personal") return true;
    if (!currentWorkspace()) return false;
    if (route === "workspace") return true;
    if (route === "invite" || route === "role") {
      return currentWorkspace()?.subscriptionPlan === "pro" && hasPermission("workspace");
    }
    if (route === "people") {
      return hasPermission("workspace");
    }
    if (route === "billing") return hasPermission("read:billing");
    if (route === "api") return hasPermission("read:api_keys");
    if (route === "key") {
      return params.keyID ? hasPermission("read:api_keys") : hasPermission("api_keys");
    }

    return false;
  };

  const unsubscribeFromUpdates = subscribeToUpdates((event) => {
    const route = activeRoute();
    const queryKeys = new Set<string>();

    if (route === "workspace" && event.action.startsWith("workspace:")) {
      queryKeys.add("workspaces");
    }

    if (route === "people") {
      if (event.action.startsWith("membership:") || event.action.startsWith("invite:")) {
        queryKeys.add("memberships");
        queryKeys.add("invites");
      }

      if (event.action.startsWith("role:")) {
        queryKeys.add("roles");
        queryKeys.add("memberships");
      }
    }

    if (route === "invite" && event.action.startsWith("role:")) {
      queryKeys.add("roles");
    }

    if (
      route === "role" &&
      (event.action.startsWith("role:") || event.action.startsWith("membership:"))
    ) {
      queryKeys.add("roles");
      queryKeys.add("memberships");
    }

    if (route === "api" && event.action.startsWith("key:")) {
      queryKeys.add("api-keys");
    }

    if (route === "key" && event.action.startsWith("key:")) {
      queryKeys.add("api-keys");
      queryKeys.add("api-key");
    }

    if (route === "billing" && event.action.startsWith("membership:")) {
      queryKeys.add("billing-subscription");
      queryKeys.add("billing-usage");
    }

    if (queryKeys.size > 0) {
      void revalidate([...queryKeys]);
    }
  });

  createEffect(() => {
    if (content.offline()) {
      navigate(`/${params.workspaceID || ""}`, { replace: true });
    }
  });
  createEffect(() => {
    const route = activeRoute();

    if (!currentWorkspace()) return;

    if (route === "people" && !hasPermission("workspace")) {
      navigate(`/${params.workspaceID || ""}/settings/personal`, { replace: true });
      return;
    }

    if (
      (route === "invite" || route === "role") &&
      (currentWorkspace()?.subscriptionPlan !== "pro" || !hasPermission("workspace"))
    ) {
      const fallbackRoute = hasPermission("workspace") ? "people" : "personal";

      navigate(`/${params.workspaceID || ""}/settings/${fallbackRoute}`, { replace: true });
    }
  });

  onCleanup(unsubscribeFromUpdates);

  return (
    <SettingsProvider>
      <Title>{`${title()} settings | Andesine`}</Title>
      <Show when={!content.offline()}>
        <div class="flex w-full flex-1 overflow-hidden px-1">
          <div class="relative flex h-full w-full overflow-hidden">
            <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
            <div class="relative z-0 w-full overflow-auto" ref={setScrollableContainerRef}>
              <div class="flex w-full flex-col items-center px-2.5 pb-5 pt-5 md:px-10 md:pb-10 md:pt-20">
                <div class="relative flex w-full max-w-[44rem] flex-col">
                  <h1 class="mb-3 text-4xl font-semibold md:text-5xl">{title()}</h1>
                  <Show
                    when={canAccessRoute()}
                    fallback={
                      <Card
                        class="flex h-16 items-center justify-center gap-1 rounded-lg bg-gray-50 px-2 text-sm text-gray-400"
                        shade
                      >
                        <div class="i-lucide:lock h-5.5 w-5.5 text-gray-300" />
                        You don’t have access to this setting.
                      </Card>
                    }
                  >
                    {props.children}
                  </Show>
                </div>
              </div>
            </div>
          </div>
        </div>
        <VerificationDialog />
      </Show>
    </SettingsProvider>
  );
};

export default SettingsLayout;
