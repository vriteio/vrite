import { Router, createAsync, query, redirect, revalidate, useLocation } from "@solidjs/router";
import { MetaProvider, Title } from "@solidjs/meta";
import {
  DropdownProvider,
  IconButton,
  ShortcutsProvider,
  TooltipProvider
} from "@andesine/components";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { ErrorBoundary, type ParentComponent, Suspense, createSignal } from "solid-js";
import { NotificationsProvider } from "./context/notifications";
import { ClipboardProvider } from "./context/clipboard";
import { LayoutProvider } from "./context/layout";
import { authClient, client } from "./lib/api";
import { getRequestEvent } from "solid-js/web";
import { appendRedirectTo, normalizeRedirectTo, routes } from "./lib/navigation";
import { validateWorkspaceID } from "./lib/validation";
import { DotsBackground } from "./components/dots-background";

const rootRedirectQuery = query(async (path: string) => {
  const event = getRequestEvent();

  if (!event && typeof window === "undefined") {
    return { success: true };
  }

  const { data } = await authClient.getSession();
  const url = event ? new URL(event.request.url) : new URL(path, window.location.origin);
  const isAuthRoute = url.pathname.startsWith("/auth");
  const isInviteRoute = url.pathname === "/invite";
  const isNewWorkspaceRoute = url.pathname === "/new-workspace";
  const pathSegments = url.pathname.split("/").filter(Boolean);
  const workspaceID = pathSegments[0] || "";
  const isWorkspaceEditor = validateWorkspaceID(workspaceID) && pathSegments.length === 1;
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

    if (isInviteRoute) {
      return { success: true };
    }

    if (redirectTo) {
      throw redirect(redirectTo);
    }

    if (isNewWorkspaceRoute) {
      return { success: true };
    }

    if (workspaceID && validateWorkspaceID(workspaceID)) {
      if (isWorkspaceEditor) {
        const workspaces = await client.workspaces.list();
        const currentEntryID = workspaces.find(({ id }) => id === workspaceID)?.currentEntryID;

        if (currentEntryID) {
          throw redirect(`/${workspaceID}/${currentEntryID}`);
        }
      }

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
      <DotsBackground class="absolute mask-edge-fading-16" />
      <div class="relative p-4 lg:p-24">
        <div class="absolute left-0 top-0 h-full w-full rounded-2xl bg-gray-100 mask-edge-fading-4 lg:mask-edge-fading-24" />
        <div class="relative flex w-72 flex-col gap-4">
          <div>
            <h1 class="text-2xl font-semibold">Something went wrong</h1>
            <p class="text-sm leading-5 text-gray-400">
              The page couldn’t be loaded. Check your connection and try again.
            </p>
          </div>
          <IconButton
            icon="i-lucide:rotate-cw"
            class="w-full @hover:bg-gray-50 gap-1"
            iconProps={{ class: "h-5 w-5 text-gray-400" }}
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
  const location = useLocation();
  const path = () => `${location.pathname}${location.search}`;

  createAsync(() => rootRedirectQuery(path()), { deferStream: true });

  return (
    <MetaProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <DropdownProvider>
            <ShortcutsProvider>
              <NotificationsProvider>
                <ClipboardProvider>
                  <LayoutProvider>
                    <ErrorBoundary fallback={(_, reset) => <AppError reset={reset} />}>
                      {/* No fallback here to avoid showing loading state while the root redirect query is being resolved */}
                      <Suspense>{props.children}</Suspense>
                    </ErrorBoundary>
                  </LayoutProvider>
                </ClipboardProvider>
              </NotificationsProvider>
            </ShortcutsProvider>
          </DropdownProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </MetaProvider>
  );
};

interface AppProps {
  url?: string;
}

const App = (props: AppProps) => (
  <Router url={props.url} root={RootLayout}>
    {routes}
  </Router>
);

export default App;
