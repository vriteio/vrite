import { Component, ParentComponent, Show, lazy } from "solid-js";
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
const ContentPieceEditorView = lazy(async () => {
  const { ContentPieceEditorView } = await import("#views/editor");

  return { default: ContentPieceEditorView };
});
const SnippetEditorView = lazy(async () => {
  const { SnippetEditorView } = await import("#views/editor");

  return { default: SnippetEditorView };
});
const VersionEditorView = lazy(async () => {
  const { VersionEditorView } = await import("#views/editor");

  return { default: VersionEditorView };
});
const DiffEditorView = lazy(async () => {
  const { DiffEditorView } = await import("#views/editor");

  return { default: DiffEditorView };
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
    <>
      <Router preload={false}>
        <Route path={["/", "**"]} component={Wrapper}>
          <Route path="/auth" component={AuthView} />
          <Route path="/verify" component={VerifyView} />
          <Route path="/workspaces" component={WorkspacesView} />
        </Route>
        <Route path={["/", "**"]} component={SecuredWrapper}>
          <Route path="/editor/:contentPieceId?" component={ContentPieceEditorView} />
          <Route path={["/:contentPieceId?"]} component={DashboardView} />
          <Route path="/snippet/:snippetId?" component={SnippetEditorView} />
          <Route path="/version/:contentPieceId?/:versionId?" component={VersionEditorView} />
          <Route
            path="/diff/:diffAgainst/:contentPieceId?/:versionId?"
            component={DiffEditorView}
          />
          <Show when={hostConfig.githubApp}>
            <Route path="/conflict" component={ConflictView} />
          </Show>
        </Route>
      </Router>
    </>
  );
};

export default App;
