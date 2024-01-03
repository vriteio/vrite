import { commit } from "./commit";
import { initialSync } from "./initial-sync";
import { getRecords } from "./get-records";
import { pull } from "./pull";
import { getTransformer } from "./get-transformer";
import { createGitSyncIntegration } from "../integration";

const useGitHubIntegration = createGitSyncIntegration({
  getTransformer,
  getRecords,
  commit,
  initialSync,
  pull
});

export { useGitHubIntegration };
