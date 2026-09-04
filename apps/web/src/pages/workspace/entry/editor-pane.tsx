import { createRef } from "@andesine/components";
import type { EditorInstance } from "@andesine/editor";
import { useLocation, useNavigate, useParams } from "@solidjs/router";
import { type Component, createEffect, createMemo } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import {
  getSearchNavigationTarget,
  scrollToSearchTarget,
  type SearchNavigationTarget
} from "#web/lib/search-navigation";
import { CollaborativeEditorPane } from "../editor/collaborative-editor-pane";
import type { DocumentLoadState } from "../editor/document-load-state";

const EditorPane: Component = () => {
  const { currentWorkspace, currentSession, content } = useWorkspace();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [editorInstance, setEditorInstance] = createRef<EditorInstance | null>(null);
  const [documentLoadState, setDocumentLoadState] = createRef<DocumentLoadState | null>(null);
  const [handledSearchTarget, setHandledSearchTarget] = createRef<SearchNavigationTarget | null>(
    null
  );
  const [openedEntryID, setOpenedEntryID] = createRef<string | null>(null);
  const selectedEntryID = () => params.slug;
  const availableEntryID = createMemo(() => {
    const entryID = selectedEntryID();

    if (!entryID) return null;

    return content.entriesCollection().findOne({ id: entryID })?.id ?? null;
  });
  const editable = createMemo(() => {
    const entry = content.entries.get({ entryID: availableEntryID() || "" });
    const collectionID = entry?.collectionID || null;

    return !content.readOnly(collectionID);
  });
  const workspaceID = () => params.workspaceID || currentWorkspace()?.id || "unknown";

  createEffect(() => {
    const selectedID = selectedEntryID();
    const availableID = availableEntryID();

    if (availableID) {
      setOpenedEntryID(availableID);
    } else if (selectedID && openedEntryID() === selectedID && !content.loading()) {
      setOpenedEntryID(null);
      navigate(`/${workspaceID()}`, { replace: true });
    }
  });
  createEffect(() => {
    const editor = editorInstance();
    const loadState = documentLoadState();
    const target = getSearchNavigationTarget(location.state);
    const contentReady = Boolean(
      loadState?.editorReady && (loadState.initialSyncComplete || loadState.hasLocalSnapshot)
    );

    if (
      !editor ||
      !target ||
      target === handledSearchTarget() ||
      target.entryID !== selectedEntryID() ||
      !contentReady
    ) {
      return;
    }

    queueMicrotask(() => {
      if (editorInstance() !== editor) return;
      if (scrollToSearchTarget(editor, target)) setHandledSearchTarget(target);
    });
  });

  return (
    <CollaborativeEditorPane
      documentID={selectedEntryID()}
      availableDocumentID={availableEntryID()}
      editable={editable()}
      loading={content.loading()}
      workspaceID={workspaceID()}
      user={currentSession()?.user}
      resourceLabel="entry"
      emptyIcon="i-lucide:file-pen"
      emptyMessage="Select an entry to start editing"
      notFoundIcon="i-lucide:file-x"
      notFoundMessage="Entry not found"
      onBack={() => navigate(`/${workspaceID()}`)}
      onLoadStateChange={setDocumentLoadState}
      onEditor={(editor) => {
        setEditorInstance(editor);

        return () => {
          if (editorInstance() === editor) setEditorInstance(null);
        };
      }}
      onTitleChange={(title, entryID) => {
        const entries = content.entriesCollection();
        const entry = entries.findOne({ id: entryID }, { reactive: false });

        if (entry && entry.name !== title) {
          entries.updateOne({ id: entry.id }, { $set: { name: title } });
        }
      }}
    />
  );
};

export { EditorPane };
