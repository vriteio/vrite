import { ObjectId } from "mongodb";
import { CommonGitProviderData, FullGitData } from "#collections";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID } from "#lib/mongo";

interface CommonGitProviderFunctionInput {
  ctx: AuthenticatedContext;
  gitData: UnderscoreID<FullGitData<ObjectId>>;
}
interface CommonGitProviderCommitInput extends CommonGitProviderFunctionInput {
  message: string;
  additions: Array<{ path: string; contents: string }>;
  changes: Array<{ path: string; contents: string }>;
  deletions: Array<{ path: string }>;
}
type CommonGitProviderCommit = {
  id: string;
  date: string;
};
type CommonGitProviderRecord = {
  path: string;
  hash: string;
  status: string;
  content: string;
};
type CommonGitProviderDirectory = {
  path: string;
  name: string;
  directories: CommonGitProviderDirectory[];
  records: CommonGitProviderRecord[];
};
interface GitSyncConfiguration {
  getData(input: CommonGitProviderFunctionInput): CommonGitProviderData;
  commit(input: CommonGitProviderCommitInput): Promise<{
    commit?: CommonGitProviderCommit;
    status: "success" | "stale";
  }>;
  pull(input: CommonGitProviderFunctionInput): Promise<{
    changedRecordsByDirectory: Map<string, Array<CommonGitProviderRecord>>;
    lastCommit: CommonGitProviderCommit;
  }>;
  initialSync(input: CommonGitProviderFunctionInput): Promise<{
    directory: CommonGitProviderDirectory;
    lastCommit: CommonGitProviderCommit;
  }>;
}

type UseGitProvider = (
  ctx: AuthenticatedContext,
  gitData: UnderscoreID<FullGitData<ObjectId>>
) => {
  data: ReturnType<GitSyncConfiguration["getData"]>;
  commit: (
    input: Omit<CommonGitProviderCommitInput, keyof CommonGitProviderFunctionInput>
  ) => ReturnType<GitSyncConfiguration["commit"]>;
  pull: () => ReturnType<GitSyncConfiguration["pull"]>;
  initialSync: () => ReturnType<GitSyncConfiguration["initialSync"]>;
};

const defineGitProvider = (configuration: GitSyncConfiguration): UseGitProvider => {
  return (ctx: AuthenticatedContext, gitData: UnderscoreID<FullGitData<ObjectId>>) => {
    return {
      get data() {
        return configuration.getData({ ctx, gitData });
      },
      commit: (input) => {
        return configuration.commit({ ctx, gitData, ...input });
      },
      pull: () => configuration.pull({ ctx, gitData }),
      initialSync: () => configuration.initialSync({ ctx, gitData })
    };
  };
};

export { defineGitProvider };
export type {
  GitSyncConfiguration,
  UseGitProvider,
  CommonGitProviderCommit,
  CommonGitProviderRecord,
  CommonGitProviderDirectory
};
