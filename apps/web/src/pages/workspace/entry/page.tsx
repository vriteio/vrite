import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import { Component } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { EditorPane } from "./components/editor-pane";

const EntryPage: Component = () => {
  const params = useParams<{ slug?: string }>();
  const { content, currentWorkspace } = useWorkspace();
  const title = () => {
    const entry = params.slug ? content.entriesCollection().findOne({ id: params.slug }) : null;

    return `${entry?.name || currentWorkspace()?.name || "Workspace"} | Andesine`;
  };

  return (
    <>
      <Title>{title()}</Title>
      <EditorPane />
    </>
  );
};

export default EntryPage;
