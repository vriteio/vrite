import { ObjectId } from "mongodb";
import {
  FullContentGroup,
  FullContentPiece,
  FullContents,
  FullGitData,
  GitDirectory,
  GitRecord
} from "#collections";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID } from "#lib/mongo";

interface GitSyncCommit {
  id: string;
  date: string;
}
interface GitSyncFunctionInput {
  ctx: AuthenticatedContext;
  gitData: UnderscoreID<FullGitData<ObjectId>>;
}
interface GitSyncCommitInput extends GitSyncFunctionInput {
  message: string;
  additions: Array<{ path: string; contents: string }>;
  deletions: Array<{ path: string }>;
}
interface GitSyncConfiguration {
  getRecords: (input: GitSyncFunctionInput) => GitRecord<ObjectId>[];
  getTransformer: (input: GitSyncFunctionInput) => string;
  commit(input: GitSyncCommitInput): Promise<{
    commit?: GitSyncCommit;
    status: "success" | "stale";
  }>;
  pull(input: GitSyncFunctionInput): Promise<{
    changedRecordsByDirectory: Map<
      string,
      Array<{ fileName: string; status: string; content?: string; hash: string }>
    >;
    lastCommit: GitSyncCommit;
  }>;
  initialSync(input: GitSyncFunctionInput): Promise<{
    newContentGroups: UnderscoreID<FullContentGroup<ObjectId>>[];
    newContentPieces: UnderscoreID<FullContentPiece<ObjectId>>[];
    newContents: UnderscoreID<FullContents<ObjectId>>[];
    newRecords: GitRecord<ObjectId>[];
    newDirectories: GitDirectory<ObjectId>[];
    topContentGroup: UnderscoreID<FullContentGroup<ObjectId>>;
    lastCommit: GitSyncCommit;
  }>;
}

type UseGitSyncIntegration = (
  ctx: AuthenticatedContext,
  gitData: UnderscoreID<FullGitData<ObjectId>>
) => {
  getRecords: () => ReturnType<GitSyncConfiguration["getRecords"]>;
  getTransformer: () => ReturnType<GitSyncConfiguration["getTransformer"]>;
  commit: (
    input: Omit<GitSyncCommitInput, "ctx" | "gitData">
  ) => ReturnType<GitSyncConfiguration["commit"]>;
  pull: () => ReturnType<GitSyncConfiguration["pull"]>;
  initialSync: () => ReturnType<GitSyncConfiguration["initialSync"]>;
};

const createGitSyncIntegration = (configuration: GitSyncConfiguration): UseGitSyncIntegration => {
  return (ctx: AuthenticatedContext, gitData: UnderscoreID<FullGitData<ObjectId>>) => {
    return {
      getRecords: () => configuration.getRecords({ ctx, gitData }),
      getTransformer: () => configuration.getTransformer({ ctx, gitData }),
      commit: (input) => {
        return configuration.commit({ ctx, gitData, ...input });
      },
      pull: () => configuration.pull({ ctx, gitData }),
      initialSync: () => configuration.initialSync({ ctx, gitData })
    };
  };
};

export { createGitSyncIntegration };
export type { GitSyncConfiguration, UseGitSyncIntegration, GitSyncCommit };
