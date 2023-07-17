import { Component, Match, Switch, lazy } from "solid-js";
import { Outlet, Route, Routes } from "@solidjs/router";
import { StandaloneLayout, SecuredLayout } from "#layout";
import { isEditorApp } from "#lib/utils";

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
const SecuredWrapper: Component = () => {
  return (
    <SecuredLayout>
      <Outlet />
    </SecuredLayout>
  );
};
const Wrapper: Component = () => {
  return (
    <div class="flex flex-col flex-1 h-full overflow-hidden scrollbar-contrast justify-center items-center">
      <Outlet />
    </div>
  );
};
const StandaloneWrapper: Component = () => {
  return (
    <StandaloneLayout>
      <Outlet />
    </StandaloneLayout>
  );
};
const App: Component = () => {
  return (
    <Routes>
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
            <Route path="/editor" component={EditorView} />
            <Route path={["/", "**"]} component={DashboardView} />
          </Route>
        </Match>
      </Switch>
    </Routes>
  );
};

export default App;
