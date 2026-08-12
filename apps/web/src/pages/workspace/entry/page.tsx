import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import { type Component, createEffect } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/api";
import { EditorPane } from "./editor-pane";
import { createRef } from "@andesine/components";

const EntryPage: Component = () => {
  const params = useParams<{ slug?: string }>();
  const { content, currentWorkspace } = useWorkspace();
  const [persistedEntryID, setPersistedEntryID] = createRef<string | undefined>(undefined);
  const title = () => {
    const entry = params.slug ? content.entriesCollection().findOne({ id: params.slug }) : null;

    return `${entry?.name || currentWorkspace()?.name || "Workspace"} | Andesine`;
  };

  createEffect(() => {
    const entryID = params.slug;

    if (!entryID || persistedEntryID() === entryID) return;

    const entry = content.entriesCollection().findOne({ id: entryID });

    if (!entry) return;

    setPersistedEntryID(entryID);
    void client.sync.setCurrentEntry({ entryID }).catch(() => {});
  });

  return (
    <>
      <Title>{title()}</Title>
      <EditorPane />
    </>
  );
};

export default EntryPage;
