import { Component, Match, ParentComponent, Show, Switch, lazy } from "solid-js";
import { Route, Router } from "@solidjs/router";
import RelativeTimePlugin from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import { SecuredLayout } from "#layout";
import { useHostConfig } from "#context";

dayjs.extend(RelativeTimePlugin);

const AuthView = lazy(async () => {
  const { AuthView } = await import("#views/auth");

  return { default: AuthView };
});
const VerifyView = lazy(async () => {
  const { VerifyView } = await import("#views/verify");

  return { default: VerifyView };
});
const ConflictView = lazy(async () => {
  const { ConflictView } = await import("#views/conflict");

  return { default: ConflictView };
});
const EditorView = lazy(async () => {
  const { EditorView } = await import("#views/editor");

  return { default: EditorView };
});
const DashboardView = lazy(async () => {
  const { DashboardView } = await import("#views/dashboard");

  return { default: DashboardView };
});
const WorkspacesView = lazy(async () => {
  const { WorkspacesView } = await import("#views/workspaces");

  return { default: WorkspacesView };
});
const SecuredWrapper: ParentComponent = (props) => {
  return <SecuredLayout>{props.children}</SecuredLayout>;
};
const Wrapper: ParentComponent = (props) => {
  return (
    <div class="flex flex-col flex-1 h-full overflow-hidden scrollbar-contrast justify-center items-center">
      {props.children}
    </div>
  );
};
const App: Component = () => {
  const hostConfig = useHostConfig();

  return (
    <Router preload={false}>
      <Route path={["/", "**"]} component={Wrapper}>
        <Route path="/auth" component={AuthView} />
        <Route path="/verify" component={VerifyView} />
        <Route path="/workspaces" component={WorkspacesView} />
        <Route path="/edit" component={EditorView} />
      </Route>
      <Route path={["/", "**"]} component={SecuredWrapper}>
        <Route path={["/", "/*contentPiece"]} component={DashboardView} />
        <Route path="/editor/*contentPiece" component={EditorView} />
        <Show when={hostConfig.githubApp}>
          <Route path="/conflict" component={ConflictView} />
        </Show>
      </Route>
    </Router>
  );
};

export default App;
