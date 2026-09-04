import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { Editor as EditorInstance, JSONContent } from "@tiptap/core";

interface EditorProviderSetupResult {
  cleanup?(): void;
  renderImmediately: boolean;
}
interface EditorDiffChange {
  from: number;
  inline: boolean;
  to: number;
  type: "added" | "modified" | "removed";
}
interface EditorDiff {
  changes: EditorDiffChange[];
}
interface MergedVersionDiff extends EditorDiff {
  content: JSONContent;
}
interface VersionComparison {
  current: MergedVersionDiff;
  inline: MergedVersionDiff;
  previous: MergedVersionDiff;
}
interface EditorProps {
  class?: string;
  content?: JSONContent;
  url?: string;
  doc?: string;
  editable?: boolean;
  mode?: EditorMode;
  staticTitle?: string;
  diff?: EditorDiff;
  providerAttempt?: number;
  notify?(type: "success" | "error", text: string): void;
  collaborationUser?: { name: string; color: string };
  beforeProviderAttach?: EditorProviderSetup;
  onProvider?(provider: EditorProvider): EditorCleanup;
  onProviderSetupError?(error: unknown, provider: EditorProvider): void;
  onEditor?(editor: EditorInstance): EditorCleanup;
  onScrollContainer?(container: HTMLElement | null): void;
  onTitleChange?(title: string): void;
}

type EditorMode = "entry" | "schema";
type EditorProvider = HocuspocusProvider;
type EditorCleanup = (() => void) | void;
type EditorProviderSetup = (
  provider: EditorProvider
) => EditorProviderSetupResult | Promise<EditorProviderSetupResult>;

export type {
  EditorCleanup,
  EditorDiff,
  EditorDiffChange,
  EditorInstance,
  EditorMode,
  EditorProps,
  EditorProvider,
  EditorProviderSetup,
  EditorProviderSetupResult,
  MergedVersionDiff,
  VersionComparison
};
