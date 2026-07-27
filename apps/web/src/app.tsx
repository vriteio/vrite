import { Params, Router, createAsync, query, redirect } from "@solidjs/router";
import { MetaProvider } from "@solidjs/meta";
import { TooltipProvider, ShortcutsProvider } from "@andesine/components";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { ParentComponent, Suspense } from "solid-js";
import { NotificationsProvider } from "./context/notifications";
import { LayoutProvider } from "./context/layout";
import { authClient } from "./lib/client";
import { getRequestEvent } from "solid-js/web";
import { appendRedirectTo, normalizeRedirectTo } from "./lib/redirects";
import { validateWorkspaceID } from "./lib/validate";
import { routes } from "./lib/routes";

const rootRedirectQuery = query(async () => {
  const event = getRequestEvent();

  if (!event && typeof window === "undefined") {
    return { success: true };
  }

  const { data } = await authClient.getSession();
  const url = new URL(event ? event.request.url : window.location.href);
  const isAuthRoute = url.pathname.startsWith("/auth");
  const workspaceID = url.pathname.split("/")[1] || "";
  const isAddAccount = url.searchParams.get("addAccount") === "true";
  const redirectTo = normalizeRedirectTo(url.searchParams.get("redirectTo"));

  if (!data?.session) {
    if (!isAuthRoute) {
      throw redirect(appendRedirectTo("/auth/sign-in", redirectTo));
    }

    return { success: true };
  } else {
    const { currentWorkspaceID } = data.user;

    if (isAuthRoute && isAddAccount) {
      return { success: true };
    }

    if (redirectTo) {
      throw redirect(redirectTo);
    }

    if (workspaceID && validateWorkspaceID(workspaceID)) {
      return { success: true };
    }

    if (!currentWorkspaceID) {
      throw redirect(`/new-workspace`);
    }

    if (currentWorkspaceID) {
      throw redirect(`/${currentWorkspaceID}`);
    }
  }

  return { success: true };
}, "root-redirect");

const RootLayout: ParentComponent = (props) => {
  const queryClient = new QueryClient();

  createAsync(() => rootRedirectQuery(), { deferStream: true });

  return (
    <MetaProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ShortcutsProvider>
            <NotificationsProvider>
              <LayoutProvider>
                <Suspense>{props.children}</Suspense>
              </LayoutProvider>
            </NotificationsProvider>
          </ShortcutsProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </MetaProvider>
  );
};

interface AppProps {
  url?: string;
}

const App = (props: AppProps) => {
  return (
    <Router url={props.url} root={RootLayout}>
      {routes}
    </Router>
  );
};

export default App;
