import { Card, ScrollShadow, createRef } from "@andesine/components";
import { Title } from "@solidjs/meta";
import { revalidate, RouteSectionProps, useLocation, useParams } from "@solidjs/router";
import { Component, onCleanup, Show } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { useRouteData } from "#web/lib/routes";
import { SettingsProvider } from "./settings-context";
import { VerificationDialog } from "./verification-dialog";

const SettingsLayout: Component<RouteSectionProps> = (props) => {
  const routeData = useRouteData();
  const location = useLocation();
  const params = useParams<{ workspaceID?: string; keyID?: string }>();
  const { currentWorkspace, hasPermission, subscribeToUpdates } = useWorkspace();
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
    if (route === "people" || route === "invite" || route === "role") {
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

  onCleanup(unsubscribeFromUpdates);

  return (
    <SettingsProvider>
      <Title>{`${title()} settings | Andesine`}</Title>
      <div class="flex w-full flex-1 overflow-hidden px-4">
        <div class="relative flex h-full w-full overflow-hidden">
          <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
          <div class="relative z-0 w-full overflow-auto p-5" ref={setScrollableContainerRef}>
            <div class="flex w-full flex-col items-center">
              <div class="relative my-2 flex w-full max-w-[44rem] flex-col">
                <h1 class="my-3 text-5xl font-semibold">{title()}</h1>
                <Show
                  when={canAccessRoute()}
                  fallback={
                    <Card
                      class="flex h-16 items-center justify-center gap-1 rounded-lg bg-white px-2 text-sm text-gray-400"
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
    </SettingsProvider>
  );
};

export default SettingsLayout;
