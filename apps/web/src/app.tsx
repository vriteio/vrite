import { Route, Router, createAsync, query, redirect } from "@solidjs/router";
import { MetaProvider } from "@solidjs/meta";
import { TooltipProvider, ShortcutsProvider } from "@andesine/components";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { ParentComponent, Suspense } from "solid-js";
import { NotificationsProvider } from "./context/notifications";
import { LayoutProvider } from "./context/layout";
import AuthLayout from "./pages/auth/layout";
import EmailPage from "./pages/auth/email/page";
import SignInPage from "./pages/auth/sign-in/page";
import SignUpPage from "./pages/auth/sign-up/page";
import InvitePage from "./pages/invite/page";
import NewWorkspacePage from "./pages/new-workspace/page";
import WorkspaceLayout from "./pages/workspace/layout";
import HomePage from "./pages/workspace/entry/page";
import SettingsLayout from "./pages/workspace/settings/layout";
import PersonalSettingsPage from "./pages/workspace/settings/people/page";
import WorkspaceSettingsPage from "./pages/workspace/settings/workspace/page";
import PeopleSettingsPage from "./pages/workspace/settings/personal/page";
import InviteSettingsPage from "./pages/workspace/settings/invite/page";
import RoleSettingsPage from "./pages/workspace/settings/role/page";
import BillingSettingsPage from "./pages/workspace/settings/billing/page";
import APISettingsPage from "./pages/workspace/settings/api/page";
import KeySettingsPage from "./pages/workspace/settings/key/page";
import { authClient } from "./lib/client";
import { getRequestEvent } from "solid-js/web";
import { appendRedirectTo, normalizeRedirectTo } from "./lib/redirects";
import { validateWorkspaceID } from "./lib/validate";

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
      <Route path="/auth" component={AuthLayout}>
        <Route path="/sign-in" component={SignInPage} />
        <Route path="/sign-up" component={SignUpPage} />
        <Route path="/email" component={EmailPage} />
      </Route>
      <Route path="/invite" component={InvitePage} />
      <Route path="/new-workspace" component={NewWorkspacePage} />
      <Route path="/:workspaceID" component={WorkspaceLayout}>
        <Route path="/settings" component={SettingsLayout}>
          <Route path={["/", "/personal"]} component={PersonalSettingsPage} />
          <Route path="/workspace" component={WorkspaceSettingsPage} />
          <Route path="/people" component={PeopleSettingsPage} />
          <Route path="/invite" component={InviteSettingsPage} />
          <Route path="/role/:roleID?" component={RoleSettingsPage} />
          <Route path="/billing" component={BillingSettingsPage} />
          <Route path="/api" component={APISettingsPage} />
          <Route path="/key/:keyID?" component={KeySettingsPage} />
        </Route>
        <Route path="/" component={HomePage} />
        <Route path="/*slug" component={HomePage} />
      </Route>
    </Router>
  );
};

export default App;
