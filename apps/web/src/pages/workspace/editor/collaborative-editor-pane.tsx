import { Editor, type EditorInstance, type EditorMode } from "@andesine/editor";
import clsx from "clsx";
import { type Component, createEffect, Show } from "solid-js";
import { useNotify } from "#web/context/notifications";
import { config } from "#web/lib/api";
import { CollaborationStatusIndicator } from "./collaboration-status-indicator";
import { type DocumentLoadState, useDocumentLoadState } from "./document-load-state";
import { getCollaborationStatus, getCollaborationUser } from "./editor-collaboration";
import {
  DocumentLoadError,
  EDITOR_CONTENT_PADDING,
  EditorContentSkeleton
} from "./editor-pane-states";
import { createLocalEditorSnapshotLifecycle, LocalSnapshotError } from "./local-editor-snapshot";

interface CollaborativeEditorPaneProps {
  availableDocumentID?: string | null;
  documentID?: string;
  editable: boolean;
  emptyIcon: string;
  emptyMessage: string;
  loading: boolean;
  mode?: EditorMode;
  notFoundIcon: string;
  notFoundMessage: string;
  resourceLabel: string;
  staticTitle?: string;
  user?: { id?: string; name?: string | null; email?: string };
  workspaceID: string;
  onBack(): void;
  onEditor?(editor: EditorInstance): (() => void) | void;
  onLoadStateChange?(state: DocumentLoadState): void;
  onTitleChange?(title: string, documentID: string): void;
}

const CollaborativeEditorPane: Component<CollaborativeEditorPaneProps> = (props) => {
  const notify = useNotify();
  const selectedDocumentID = () => props.documentID;
  const {
    documentLoadState,
    providerAttempt,
    discardLocalSnapshot,
    setLocalSnapshot,
    setLocalSnapshotTimeout,
    setLocalSnapshotFailure,
    retryCollaboration,
    markEditorReady,
    handleProvider
  } = useDocumentLoadState(selectedDocumentID);
  const collaborationStatus = () => {
    const state = documentLoadState();

    if (props.editable && state.collaborationReadOnly) return "schema-reset";

    return getCollaborationStatus(state);
  };
  const collaborationUser = () => getCollaborationUser(props.user);
  const editable = () => {
    const state = documentLoadState();
    const schemaConnected = state.connection === "connected" && state.authenticated;

    return (
      props.editable &&
      !state.collaborationReadOnly &&
      (props.mode !== "schema" || schemaConnected) &&
      !state.resettingSchemaContent
    );
  };
  const { beforeProviderAttach } = createLocalEditorSnapshotLifecycle({
    workspaceID: () => props.workspaceID,
    discardLocalSnapshot,
    setLocalSnapshot,
    setLocalSnapshotTimeout,
    setLocalSnapshotFailure,
    notifyError: (text) => notify({ type: "error", text })
  });
  const showContentSkeleton = () => {
    const documentID = selectedDocumentID();
    const state = documentLoadState();

    return Boolean(
      documentID &&
      state.documentID === documentID &&
      !state.isCheckingLocal &&
      !state.hasLocalSnapshot &&
      !state.editorReady &&
      !state.problem
    );
  };

  createEffect(() => {
    props.onLoadStateChange?.(documentLoadState());
  });

  return (
    <div class="flex w-full flex-1 overflow-hidden">
      <Show
        when={selectedDocumentID()}
        fallback={
          <div class="flex h-full w-full flex-col items-center justify-center gap-2">
            <div class={clsx("h-12 w-12 text-gray-200", props.emptyIcon)} />
            <span class="text-xs text-gray-300">{props.emptyMessage}</span>
          </div>
        }
      >
        <Show
          when={props.availableDocumentID}
          keyed
          fallback={
            <Show
              when={props.loading}
              fallback={
                <div class="flex h-full w-full flex-col items-center justify-center gap-2">
                  <div class={clsx("h-12 w-12 text-gray-200", props.notFoundIcon)} />
                  <span class="text-xs text-gray-300">{props.notFoundMessage}</span>
                </div>
              }
            >
              <div class="relative h-full w-full overflow-hidden">
                <EditorContentSkeleton class={EDITOR_CONTENT_PADDING} />
              </div>
            </Show>
          }
        >
          {(documentID) => (
            <div class="relative flex h-full w-full overflow-hidden">
              <Show when={showContentSkeleton()}>
                <EditorContentSkeleton class={EDITOR_CONTENT_PADDING} />
              </Show>
              <Show when={documentLoadState().problem} keyed>
                {(problem) => (
                  <DocumentLoadError
                    problem={problem}
                    localTimeoutCount={documentLoadState().localTimeoutCount}
                    resourceLabel={props.resourceLabel}
                    onRetry={retryCollaboration}
                    onBack={props.onBack}
                  />
                )}
              </Show>
              <Show
                when={
                  (!documentLoadState().isCheckingLocal ||
                    documentLoadState().resettingSchemaContent) &&
                  !documentLoadState().problem
                }
              >
                <CollaborationStatusIndicator
                  status={collaborationStatus()}
                  hasLocalSnapshot={documentLoadState().hasLocalSnapshot}
                  resourceLabel={props.resourceLabel}
                  onRetry={retryCollaboration}
                  onBack={props.onBack}
                />
              </Show>
              <div
                class={clsx(
                  "h-full w-full md:px-1",
                  !documentLoadState().editorReady && "invisible"
                )}
              >
                <Editor
                  class={EDITOR_CONTENT_PADDING}
                  doc={documentID}
                  url={`${config.PUBLIC_WS_API_URL}/collab`}
                  providerAttempt={providerAttempt()}
                  editable={editable()}
                  mode={props.mode}
                  staticTitle={props.staticTitle}
                  notify={(type, text) => notify({ type, text })}
                  collaborationUser={collaborationUser()}
                  beforeProviderAttach={beforeProviderAttach}
                  onProvider={handleProvider}
                  onProviderSetupError={(error) => {
                    if (!(error instanceof LocalSnapshotError)) {
                      setLocalSnapshotFailure(documentID);
                    }
                  }}
                  onEditor={(editor) => {
                    const markEditorNotReady = markEditorReady(documentID);
                    const cleanup = props.onEditor?.(editor);

                    return () => {
                      cleanup?.();
                      markEditorNotReady();
                    };
                  }}
                  onTitleChange={(title) => props.onTitleChange?.(title, documentID)}
                />
              </div>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
};

export { CollaborativeEditorPane };
