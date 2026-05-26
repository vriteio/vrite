import { Route, Router, createAsync, query, redirect } from "@solidjs/router";
import { TooltipProvider, ShortcutsProvider } from "@andesine/components";
import { Component, Suspense } from "solid-js";
import { NotificationsProvider } from "./context/notifications";
import { LayoutProvider } from "./context/layout";
import { getSessionData } from "./lib/session";
import AuthLayout from "./routes/auth";
import EmailPage from "./routes/auth/email";
import SignInPage from "./routes/auth/sign-in";
import SignUpPage from "./routes/auth/sign-up";
import InvitePage from "./routes/invite";
import NewWorkspacePage from "./routes/new-workspace";
import WorkspaceLayout from "./routes/[[workspaceID]]";
import HomePage from "./routes/[[workspaceID]]/[...slug]";
import "virtual:uno.css";
import "./styles.scss";

const rootRedirectQuery = query(async () => {
  const data = await getSessionData();

  if (!data?.session) {
    return redirect("/auth/sign-in");
  }

  if (data.user.currentWorkspaceID) {
    return redirect(`/${data.user.currentWorkspaceID}/`);
  }

  return redirect("/new-workspace");
}, "root-redirect");

const RootPage: Component = () => {
  createAsync(() => rootRedirectQuery(), { deferStream: true });

  return null;
};

interface AppProps {
  url?: string;
}

const App = (props: AppProps) => {
  return (
    <Router
      url={props.url}
      root={(props) => (
        <Suspense>
          <TooltipProvider>
            <ShortcutsProvider>
              <NotificationsProvider>
                <LayoutProvider>{props.children}</LayoutProvider>
              </NotificationsProvider>
            </ShortcutsProvider>
          </TooltipProvider>
        </Suspense>
      )}
    >
      <Route path="/" component={RootPage} />
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
