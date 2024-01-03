import { useGitHubIntegration } from "./github";
import { UseGitSyncIntegration } from "./integration";
import { ObjectId } from "mongodb";
import { FullGitData } from "#collections";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID } from "#lib/mongo";

const useGitSyncIntegration = (
  ctx: AuthenticatedContext,
  gitData: UnderscoreID<FullGitData<ObjectId>>
): ReturnType<UseGitSyncIntegration> | null => {
  if (gitData.github) {
    return useGitHubIntegration(ctx, gitData);
  }

  return null;
};

export { useGitSyncIntegration };
export * from "./process-content";
export * from "./process-pulled-records";
