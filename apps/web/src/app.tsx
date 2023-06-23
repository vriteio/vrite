import { Component, ParentComponent, lazy } from "solid-js";
import { Outlet, Route, Routes } from "@solidjs/router";
import { AuthView } from "#views/auth";
import { Layout } from "#layout";
import { VerifyView } from "#views/verify";

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
    <Layout>
      <Outlet />
    </Layout>
  );
};
const Wrapper: Component = () => {
  return (
    <div class="flex flex-col flex-1 h-full overflow-hidden scrollbar-contrast justify-center items-center">
      <Outlet />
    </div>
  );
};
const App: Component = () => {
  return (
    <Routes>
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
    </Routes>
  );
};

export default App;
