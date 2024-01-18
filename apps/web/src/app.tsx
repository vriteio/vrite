import { Component, Match, ParentComponent, Show, Switch, lazy } from "solid-js";
import { Route, Router } from "@solidjs/router";
import { StandaloneLayout, SecuredLayout } from "#layout";
import { isEditorApp } from "#lib/utils";
import { useHostConfig } from "#context";

const AuthView = lazy(async () => {
  const { AuthView } = await import("#views/auth");

  return { default: AuthView };
});
const VerifyView = lazy(async () => {
  const { VerifyView } = await import("#views/verify");

  return { default: VerifyView };
});
const StandaloneEditorView = lazy(async () => {
  const { StandaloneEditorView } = await import("#views/standalone-editor");

  return { default: StandaloneEditorView };
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
const StandaloneWrapper: ParentComponent = (props) => {
  return <StandaloneLayout>{props.children}</StandaloneLayout>;
};
const App: Component = () => {
  const hostConfig = useHostConfig();

  return (
    <Router preload={false}>
      <Switch>
        <Match when={isEditorApp()}>
          <Route path={["/", "**"]} component={StandaloneWrapper}>
            <Route path={["/", "**"]} component={StandaloneEditorView} />
          </Route>
        </Match>
        <Match when={!isEditorApp()}>
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
        </Match>
      </Switch>
    </Router>
  );
};

export default App;
