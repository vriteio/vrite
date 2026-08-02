import { Router, createAsync, query, redirect, revalidate } from "@solidjs/router";
import { MetaProvider, Title } from "@solidjs/meta";
import { TooltipProvider, ShortcutsProvider, IconButton } from "@andesine/components";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { ErrorBoundary, ParentComponent, Suspense, createSignal } from "solid-js";
import { NotificationsProvider } from "./context/notifications";
import { ClipboardProvider } from "./context/clipboard";
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
  const isNewWorkspaceRoute = url.pathname === "/new-workspace";
  const workspaceID = url.pathname.split("/")[1] || "";
  const isAddAccount = url.searchParams.get("addAccount") === "true";
  const redirectTo = normalizeRedirectTo(url.searchParams.get("redirectTo"));

  if (!data?.session) {
    if (!isAuthRoute) {
      throw redirect(appendRedirectTo("/auth/sign-in", `${url.pathname}${url.search}`));
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

    if (isNewWorkspaceRoute) {
      return { success: true };
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

interface AppErrorProps {
  reset(): void;
}

const AppError = (props: AppErrorProps) => {
  const [retrying, setRetrying] = createSignal(false);
  const retry = async () => {
    setRetrying(true);

    try {
      await revalidate();
      props.reset();
    } catch {
      setRetrying(false);
    }
  };

  return (
    <main class="relative flex h-full w-full items-center justify-center">
      <Title>Something went wrong | Andesine</Title>
      <div class="dots-background absolute mask-edge-fading-16" />
      <div class="relative p-4 lg:p-24">
        <div class="absolute left-0 top-0 h-full w-full rounded-2xl bg-gray-100 mask-edge-fading-4 dark:bg-gray-850 lg:mask-edge-fading-24" />
        <div class="relative flex w-72 flex-col gap-4">
          <div>
            <h1 class="text-2xl font-semibold">Something went wrong</h1>
            <p class="text-sm leading-5 text-gray-400 dark:text-gray-500">
              The page couldn’t be loaded. Check your connection and try again.
            </p>
          </div>
          <IconButton
            icon="i-lucide:rotate-cw"
            class="w-full @hover:bg-gray-50 gap-1"
            iconProps={{ class: "h-5 w-5 text-gray-400 dark:text-gray-500" }}
            variant="outlined"
            color="contrast"
            label="Retry"
            onClick={retry}
            disabled={retrying()}
          />
        </div>
      </div>
    </main>
  );
};
const RootLayout: ParentComponent = (props) => {
  const queryClient = new QueryClient();

  createAsync(() => rootRedirectQuery(), { deferStream: true });

  return (
    <MetaProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ShortcutsProvider>
            <NotificationsProvider>
              <ClipboardProvider>
                <LayoutProvider>
                  <ErrorBoundary fallback={(_, reset) => <AppError reset={reset} />}>
                    <Suspense>{props.children}</Suspense>
                  </ErrorBoundary>
                </LayoutProvider>
              </ClipboardProvider>
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
