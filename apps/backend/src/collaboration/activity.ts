import type { Extension, onChangePayload } from "@hocuspocus/server";
import type { CollaborationContext } from "./types";

const pendingContributors = new Map<string, Set<string>>();
const getContributorID = (context?: CollaborationContext): string | undefined => {
  if (context?.contributorID) return context.contributorID;

  if (context?.auth?.type === "session") return context.auth.session?.memberID;

  return undefined;
};
const getPendingContributors = (documentName: string): string[] => {
  return [...(pendingContributors.get(documentName) || [])];
};
const clearPendingContributors = (documentName: string, contributorIDs: string[]): void => {
  const contributors = pendingContributors.get(documentName);

  if (!contributors) return;

  for (const contributorID of contributorIDs) contributors.delete(contributorID);

  if (contributors.size === 0) pendingContributors.delete(documentName);
};
const collaborationActivity: Extension<CollaborationContext> = {
  async onChange({ context, documentName }: onChangePayload<CollaborationContext>) {
    const contributorID = getContributorID(context);

    if (!contributorID) return;

    const contributors = pendingContributors.get(documentName) || new Set<string>();

    contributors.add(contributorID);
    pendingContributors.set(documentName, contributors);
  }
};

export { clearPendingContributors, collaborationActivity, getPendingContributors };
