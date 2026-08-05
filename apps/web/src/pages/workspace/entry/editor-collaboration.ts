import type { EntryLoadState } from "./entry-load-state";
import type { CollaborationStatus } from "./collaboration-status-indicator";

const collaborationColors = ["#0ea5e9", "#f97316", "#22c55e", "#eab308", "#ec4899", "#8b5cf6"];

const getCollaborationColor = (seed: string) => {
  let hash = 0;
  for (const character of seed) {
    hash = (hash << 5) - hash + character.charCodeAt(0);
    hash |= 0;
  }
  return collaborationColors[Math.abs(hash) % collaborationColors.length];
};

const getCollaborationUser = (user?: { id?: string; name?: string | null; email?: string }) => {
  const name = user?.name || user?.email || "Anonymous";
  return { name, color: getCollaborationColor(user?.id || name) };
};

const getCollaborationStatus = (state: EntryLoadState): CollaborationStatus => {
  if (state.problem === "unauthorized" || state.problem === "failed") return state.problem;
  if (state.unsyncedChanges > 0) {
    return state.connection === "disconnected" ? "offline-changes" : "saved-locally";
  }
  if (state.connection === "connected" && state.synced) return "synced";
  return "connecting";
};

export { getCollaborationStatus, getCollaborationUser };
