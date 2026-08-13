import type { Collection, Entry, WorkspaceEvent } from "#web/lib/api";

interface PersistedLayout {
  leftSidePanelWidth: number;
}

const isPersistedEntry = (value: unknown): value is Entry => Boolean((value as Entry | null)?.id);
const isPersistedCollection = (value: unknown): value is Collection =>
  Boolean((value as Collection | null)?.id);
const parseLayoutCookie = (value: string | undefined): PersistedLayout | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as PersistedLayout;
    const leftSidePanelWidth = Number(parsed.leftSidePanelWidth);

    return Number.isFinite(leftSidePanelWidth) && leftSidePanelWidth >= 0
      ? { leftSidePanelWidth }
      : null;
  } catch {
    return null;
  }
};
const isWorkspaceEvent = (value: unknown): value is WorkspaceEvent => {
  const event = value as WorkspaceEvent | null;

  return typeof event?.action === "string" && Boolean(event.data);
};

export { isPersistedCollection, isPersistedEntry, isWorkspaceEvent, parseLayoutCookie };
