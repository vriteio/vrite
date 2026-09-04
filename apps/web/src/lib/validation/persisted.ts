import type { Collection, Entry, WorkspaceEvent } from "#web/lib/api";

interface PersistedLayout {
  leftSidePanelWidth: number;
  rightSidePanelWidth?: number;
}
interface PersistedCollectionSchemaSummary {
  id: string;
  collectionID: string;
  enabled: boolean;
  hasActiveVersion: boolean;
  hasUnappliedChanges: boolean;
}

const isPersistedEntry = (value: unknown): value is Entry => Boolean((value as Entry | null)?.id);
const isPersistedCollection = (value: unknown): value is Collection =>
  Boolean((value as Collection | null)?.id);
const isPersistedCollectionSchemaSummary = (
  value: unknown
): value is PersistedCollectionSchemaSummary => {
  const schema = value as PersistedCollectionSchemaSummary | null;

  return Boolean(
    schema?.id &&
    schema.collectionID &&
    schema.enabled &&
    typeof schema.hasActiveVersion === "boolean"
  );
};
const parseLayoutCookie = (value: string | undefined): PersistedLayout | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as PersistedLayout;
    const leftSidePanelWidth = Number(parsed.leftSidePanelWidth);
    const rightSidePanelWidth = Number(parsed.rightSidePanelWidth);

    if (!Number.isFinite(leftSidePanelWidth) || leftSidePanelWidth < 0) return null;

    return {
      leftSidePanelWidth,
      ...(Number.isFinite(rightSidePanelWidth) && rightSidePanelWidth >= 0
        ? { rightSidePanelWidth }
        : {})
    };
  } catch {
    return null;
  }
};
const isWorkspaceEvent = (value: unknown): value is WorkspaceEvent => {
  const event = value as WorkspaceEvent | null;

  return typeof event?.action === "string" && Boolean(event.data);
};

export {
  isPersistedCollection,
  isPersistedCollectionSchemaSummary,
  isPersistedEntry,
  isWorkspaceEvent,
  parseLayoutCookie
};
