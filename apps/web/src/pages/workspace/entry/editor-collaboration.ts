import type { EntryLoadState } from "./entry-load-state";
import type { CollaborationStatus } from "./collaboration-status-indicator";

const collaborationColors = ["#0ea5e9", "#f97316", "#22c55e", "#eab308", "#ec4899", "#8b5cf6"];
const collaborationColorByUser = new Map<string, string>();

const getCollaborationColor = (seed: string) => {
  const assignedColor = collaborationColorByUser.get(seed);

  if (assignedColor) return assignedColor;

  const color = collaborationColors[Math.floor(Math.random() * collaborationColors.length)]!;

  collaborationColorByUser.set(seed, color);

  return color;
};

const getCollaborationUser = (user?: { id?: string; name?: string | null; email?: string }) => {
  const name = user?.name || user?.email || "Anonymous";
  return { name, color: getCollaborationColor(user?.id || name) };
};

const getCollaborationStatus = (state: EntryLoadState): CollaborationStatus => {
  if (state.problem === "unauthorized" || state.problem === "failed") return state.problem;
  if (state.hasLocalSnapshot && !state.initialSyncComplete && state.connection !== "disconnected") {
    return "syncing";
  }
  if (state.unsyncedChanges > 0) {
    return state.connection === "disconnected" ? "offline-changes" : "saved-locally";
  }
  if (state.connection === "connected" && state.synced) return "synced";
  return "connecting";
};

export { getCollaborationStatus, getCollaborationUser };
