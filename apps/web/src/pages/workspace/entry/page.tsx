import { Title } from "@solidjs/meta";
import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { type Component, createEffect, Show } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/api";
import { EditorPane } from "./editor-pane";
import { createRef } from "@andesine/components";
import { VersionPreviewPane } from "./version-preview-pane";

const EntryPage: Component = () => {
  const params = useParams<{ slug?: string; workspaceID: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { content, currentWorkspace } = useWorkspace();
  const [persistedEntryID, setPersistedEntryID] = createRef<string | undefined>(undefined);
  const title = () => {
    const entry = params.slug ? content.entriesCollection().findOne({ id: params.slug }) : null;

    return `${entry?.name || currentWorkspace()?.name || "Workspace"} | Andesine`;
  };

  createEffect(() => {
    const currentEntryID = persistedEntryID() || currentWorkspace()?.currentEntryID;

    if (!params.slug && currentEntryID) {
      navigate(`/${params.workspaceID}/${currentEntryID}`, { replace: true });
    }
  });
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
      <Show when={typeof searchParams.version === "string"} fallback={<EditorPane />}>
        <VersionPreviewPane />
      </Show>
    </>
  );
};

export default EntryPage;
