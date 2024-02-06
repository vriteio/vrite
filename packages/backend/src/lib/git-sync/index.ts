import { useGitHubProvider } from "./providers/github";
import { UseGitProvider } from "./provider";
import { ObjectId } from "mongodb";
import { FullGitData } from "#collections";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID } from "#lib/mongo";

const useGitProvider = (
  ctx: AuthenticatedContext,
  gitData?: UnderscoreID<FullGitData<ObjectId>> | null
): ReturnType<UseGitProvider> | null => {
  if (gitData && gitData.github) {
    return useGitHubProvider(ctx, gitData);
  }

  return null;
};

export { useGitProvider };
export * from "./process-content";
export * from "./provider";
