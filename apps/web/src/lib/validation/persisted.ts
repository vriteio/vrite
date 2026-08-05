import type { Collection, Entry, WorkspaceEvent } from "#web/lib/api";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const hasStringID = (value: unknown): value is { id: string } & Record<string, unknown> =>
  isRecord(value) && typeof value.id === "string";
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isPersistedEntry = (value: unknown): value is Entry =>
  hasStringID(value) &&
  typeof value.name === "string" &&
  (value.collectionID === undefined || typeof value.collectionID === "string") &&
  (value.order === undefined || typeof value.order === "string");
const isPersistedCollection = (value: unknown): value is Collection =>
  hasStringID(value) &&
  typeof value.name === "string" &&
  isStringArray(value.ancestors) &&
  isStringArray(value.descendants);
const parseLayoutCookie = (value: string | undefined): { leftSidePanelWidth: number } | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value));
    if (!isRecord(parsed) || typeof parsed.leftSidePanelWidth !== "number") return null;
    if (!Number.isFinite(parsed.leftSidePanelWidth) || parsed.leftSidePanelWidth < 0) return null;
    return { leftSidePanelWidth: parsed.leftSidePanelWidth };
  } catch {
    return null;
  }
};
const workspaceEventActions = new Set([
  "entry:create",
  "entry:update",
  "entry:move",
  "entry:delete",
  "collection:create",
  "collection:update",
  "collection:move",
  "collection:delete",
  "membership:add",
  "membership:update",
  "membership:remove",
  "role:create",
  "role:update",
  "role:delete",
  "workspace:create",
  "workspace:update",
  "workspace:delete"
]);
const isWorkspaceEvent = (value: unknown): value is WorkspaceEvent =>
  isRecord(value) &&
  typeof value.action === "string" &&
  workspaceEventActions.has(value.action) &&
  isRecord(value.data);

export { isPersistedCollection, isPersistedEntry, isWorkspaceEvent, parseLayoutCookie };
