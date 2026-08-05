import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { Editor } from "@tiptap/core";

type EditorProvider = HocuspocusProvider;
type EditorCleanup = (() => void) | void;
interface EditorProviderSetupResult {
  cleanup?(): void;
  renderImmediately: boolean;
}
type EditorProviderSetup = (
  provider: EditorProvider
) => EditorProviderSetupResult | Promise<EditorProviderSetupResult>;
interface EditorProps {
  url: string;
  doc: string;
  editable?: boolean;
  providerAttempt?: number;
  notify(type: "success" | "error", text: string): void;
  collaborationUser?: { name: string; color: string };
  beforeProviderAttach?: EditorProviderSetup;
  onProvider?(provider: EditorProvider): EditorCleanup;
  onProviderSetupError?(error: unknown, provider: EditorProvider): void;
  onEditor?(editor: Editor): EditorCleanup;
  onTitleChange?(title: string): void;
}

export type {
  EditorCleanup,
  EditorProps,
  EditorProvider,
  EditorProviderSetup,
  EditorProviderSetupResult
};
