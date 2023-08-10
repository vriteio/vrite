import { Octokit } from "octokit";
import { Endpoints } from "@octokit/types";
import { GitHubData } from "#database";

type GitHubRequestData<P = void> = {
  octokit: Octokit;
  githubData: GitHubData;
} & (P extends void ? {} : { payload: P });
type GitHubCommitChangedFile = NonNullable<
  Endpoints["GET /repos/{owner}/{repo}/commits/{ref}"]["response"]["data"]["files"]
>[number];

const getLastCommit = async ({
  octokit,
  githubData
}: GitHubRequestData): Promise<{ oid: string; committedDate: string } | null> => {
  const result = await octokit.graphql<{
    repository: {
      object: {
        history: {
          nodes: Array<{
            oid: string;
            committedDate: string;
          }>;
        };
      } | null;
    } | null;
  }>(
    `query ($owner: String!, $name: String!, $branch: String!) {
    repository(owner: $owner, name: $name) {
      object(expression: $branch) {
        ... on Commit {
          history(first: 1) {
            nodes {
              oid
              committedDate
            }
          }
        }
      }
    }
  }`,
    {
      owner: githubData.repositoryOwner,
      name: githubData.repositoryName,
      branch: githubData.branchName
    }
  );

  return result?.repository?.object?.history?.nodes?.[0] || null;
};
const getCommitsSince = async ({
  octokit,
  githubData,
  payload
}: GitHubRequestData<{ since: string }>): Promise<
  Array<{
    oid: string;
    committedDate: string;
  }>
> => {
  const result = await octokit.graphql<{
    repository: {
      object: {
        history: {
          nodes: Array<{
            oid: string;
            committedDate: string;
          }>;
        };
      } | null;
    } | null;
  }>(
    `query ($owner: String!, $name: String!, $branch: String!, $since: GitTimestamp) {
      repository(owner: $owner, name: $name) {
        object(expression: $branch) {
          ... on Commit {
            history(first: 100, since: $since) {
              nodes {
                oid
                committedDate
              }
            }
          }
        }
      }
    }`,
    {
      owner: githubData.repositoryOwner,
      name: githubData.repositoryName,
      branch: githubData.branchName,
      since: payload!.since
    }
  );

  return result.repository?.object?.history.nodes.slice(0, -1).reverse() || [];
};
const getFilesChangedInCommit = async ({
  octokit,
  githubData,
  payload
}: GitHubRequestData<{
  commitId: string;
}>): Promise<GitHubCommitChangedFile[]> => {
  const result = await octokit.rest.repos.getCommit({
    owner: githubData.repositoryOwner,
    repo: githubData.repositoryName,
    ref: payload.commitId
  });

  return result.data.files || [];
};
const commitChanges = async ({
  githubData,
  octokit,
  payload
}: GitHubRequestData<{
  message: string;
  expectedCommitId: string;
  additions: Array<{ path: string; contents: string }>;
  deletions: Array<{ path: string }>;
}>): Promise<
  { oid: string; committedDate: string; status: "success" } | { status: "stale-data" } | null
> => {
  try {
    const result = await octokit.graphql<{
      createCommitOnBranch: {
        commit: {
          oid: string;
          committedDate: string;
        };
      } | null;
    }>(
      `mutation ($input: CreateCommitOnBranchInput!) {
        createCommitOnBranch(input: $input) {
          commit {
            oid
            committedDate
          }
        }
      }`,
      {
        input: {
          branch: {
            repositoryNameWithOwner: `${githubData.repositoryOwner}/${githubData.repositoryName}`,
            branchName: githubData.branchName
          },
          message: { headline: payload.message },
          expectedHeadOid: payload.expectedCommitId,
          fileChanges: {
            additions: payload.additions,
            deletions: payload.deletions
          }
        }
      }
    );
    const commit = result.createCommitOnBranch?.commit;

    if (!commit) return null;

    return { ...commit, status: "success" };
  } catch (error) {
    const errorType = (error as any)?.errors[0].type;

    if (errorType === "STALE_DATA") {
      return { status: "stale-data" };
    }
  }

  return null;
};
const getDirectory = async ({
  octokit,
  githubData,
  payload
}: GitHubRequestData<{ path: string }>): Promise<
  Array<{
    name: string;
    type: "blob" | "tree";
    object: {
      text: string | null;
    };
  }>
> => {
  const { repository } = await octokit.graphql<{
    repository: {
      object: {
        entries: Array<{
          name: string;
          type: "blob" | "tree";
          object: {
            text: string | null;
          };
        }>;
      };
    };
  }>(
    `query ($owner: String!, $name: String!, $expr: String!) {
        repository(owner: $owner, name: $name) {
          object(expression: $expr) {
            ... on Tree {
              entries {
                name
                type
                object {
                  ... on Blob {
                    text
                  }
                }
              }
            }
          }
        }
      }`,
    {
      owner: githubData.repositoryOwner,
      name: githubData.repositoryName,
      expr: `${githubData.branchName}:${payload.path}`
    }
  );

  return repository?.object?.entries || [];
};

export { getLastCommit, getCommitsSince, getFilesChangedInCommit, commitChanges, getDirectory };
