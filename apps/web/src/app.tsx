import { Route, Router, createAsync, query, redirect } from "@solidjs/router";
import { TooltipProvider, ShortcutsProvider } from "@andesine/components";
import { Component, ParentComponent, Suspense } from "solid-js";
import { NotificationsProvider } from "./context/notifications";
import { LayoutProvider } from "./context/layout";
import AuthLayout from "./routes/auth";
import EmailPage from "./routes/auth/email";
import SignInPage from "./routes/auth/sign-in";
import SignUpPage from "./routes/auth/sign-up";
import InvitePage from "./routes/invite";
import NewWorkspacePage from "./routes/new-workspace";
import WorkspaceLayout from "./routes/[[workspaceID]]";
import HomePage from "./routes/[[workspaceID]]/[...slug]";
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
  createAsync(() => rootRedirectQuery(), { deferStream: true });

  return (
    <TooltipProvider>
      <ShortcutsProvider>
        <NotificationsProvider>
          <LayoutProvider>
            <Suspense>{props.children}</Suspense>
          </LayoutProvider>
        </NotificationsProvider>
      </ShortcutsProvider>
    </TooltipProvider>
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
        <Route path="/" component={HomePage} />
        <Route path="/*slug" component={HomePage} />
      </Route>
    </Router>
  );
};

export default App;
