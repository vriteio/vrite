import { publishEvent } from "./events";
import { z } from "zod";
import { LexoRank } from "lexorank";
import { Binary } from "mongodb";
import { gfmInputTransformer, gfmOutputTransformer } from "@vrite/sdk/transformers";
import { Octokit } from "octokit";
import crypto from "node:crypto";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import * as errors from "#lib/errors";
import {
  FullContentGroup,
  FullContentPiece,
  FullContents,
  FullGitData,
  GitHubData,
  GitRecord,
  getContentGroupsCollection,
  getContentPiecesCollection,
  getContentsCollection,
  getGitDataCollection,
  getWorkspacesCollection,
  githubData
} from "#database";
import { ObjectId, UnderscoreID, bufferToJSON, htmlToJSON, jsonToBuffer } from "#lib";

const authenticatedProcedure = procedure.use(isAuthenticated);
const getDirectoryEntries = async (
  path: string,
  octokit: Octokit,
  githubData: GitHubData
): Promise<
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
      expr: `${githubData.branchName}:${path.startsWith("/") ? path.slice(1) : path}`
    }
  );

  return repository?.object?.entries || [];
};
const githubRouter = router({
  configure: authenticatedProcedure
    .input(githubData)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const gitData: UnderscoreID<FullGitData<ObjectId>> = {
        _id: new ObjectId(),
        github: input,
        records: [],
        provider: "github",
        workspaceId: ctx.auth.workspaceId
      };

      await gitDataCollection.insertOne(gitData);
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "configure",
        data: {
          github: input,
          records: [],
          provider: "github",
          id: `${gitData._id}`
        }
      });
    }),
  initialSync: authenticatedProcedure
    .input(z.void())
    .output(z.any())
    .mutation(async ({ ctx }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const contentGroupsCollection = getContentGroupsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const workspaceCollection = getWorkspacesCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

      if (!gitData?.github) throw errors.notFound("gitData");

      const newContentGroups: UnderscoreID<FullContentGroup<ObjectId>>[] = [];
      const newContentPieces: UnderscoreID<FullContentPiece<ObjectId>>[] = [];
      const newContents: UnderscoreID<FullContents<ObjectId>>[] = [];
      const newRecords: Array<GitRecord<ObjectId>> = [];
      const octokit = await ctx.fastify.github.getInstallationOctokit(
        gitData?.github.installationId
      );
      const syncDirectory = async (path: string, ancestors: ObjectId[]): Promise<ObjectId> => {
        const entries = await getDirectoryEntries(path, octokit, gitData.github!);
        const name = path.split("/").pop() || "base";
        const contentGroupId = new ObjectId();
        const descendants: ObjectId[] = [];

        let order = LexoRank.min();

        for await (const entry of entries) {
          if (entry.type === "tree") {
            const id = await syncDirectory(`${path}/${entry.name}`, [...ancestors, contentGroupId]);

            descendants.push(id);
          } else if (entry.type === "blob" && entry.object.text) {
            const contentPiece: UnderscoreID<FullContentPiece<ObjectId>> = {
              _id: new ObjectId(),
              workspaceId: ctx.auth.workspaceId,
              contentGroupId,
              members: [],
              slug: entry.name,
              tags: [],
              title: entry.name,
              order: order.toString()
            };

            order = order.genNext();
            newContentPieces.push(contentPiece);
            newContents.push({
              _id: new ObjectId(),
              contentPieceId: contentPiece._id,
              workspaceId: ctx.auth.workspaceId,
              content: new Binary(
                jsonToBuffer(htmlToJSON(gfmInputTransformer(entry.object.text || "").content))
              )
            });

            const currentHash = crypto.createHash("md5").update(entry.object.text).digest("hex");

            newRecords.push({
              contentPieceId: contentPiece._id,
              currentHash,
              syncedHash: currentHash,
              path: `${path}/${entry.name}`
            });
          }
        }

        const contentGroup: UnderscoreID<FullContentGroup<ObjectId>> = {
          _id: contentGroupId,
          workspaceId: ctx.auth.workspaceId,
          name,
          ancestors,
          descendants
        };

        newContentGroups.push(contentGroup);

        return contentGroup._id;
      };
      const id = await syncDirectory("", []);

      await contentGroupsCollection.insertMany(newContentGroups);
      await contentPiecesCollection.insertMany(newContentPieces);
      await contentsCollection.insertMany(newContents);

      const lastCommit = await octokit.graphql<{
        repository: {
          object: {
            history: {
              nodes: Array<{
                oid: string;
                committedDate: string;
              }>;
            };
          };
        };
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
          owner: gitData.github.repositoryOwner,
          name: gitData.github.repositoryName,
          branch: gitData.github.branchName
        }
      );

      await gitDataCollection.updateOne(
        { workspaceId: ctx.auth.workspaceId },
        {
          $set: {
            records: newRecords,
            lastCommitDate: lastCommit.repository.object.history.nodes[0].committedDate,
            lastCommitId: lastCommit.repository.object.history.nodes[0].oid
          }
        }
      );
      await workspaceCollection.updateOne(
        { _id: ctx.auth.workspaceId },
        {
          $push: { contentGroups: id }
        }
      );
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "update",
        data: {
          records: newRecords.map((record) => ({
            ...record,
            contentPieceId: `${record.contentPieceId}`
          })),
          lastCommitDate: lastCommit.repository.object.history.nodes[0].committedDate,
          lastCommitId: lastCommit.repository.object.history.nodes[0].oid
        }
      });

      return { synced: true };
    }),
  pull: authenticatedProcedure
    .input(z.void())
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const contentGroupsCollection = getContentGroupsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const workspaceCollection = getWorkspacesCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

      if (!gitData?.github) throw errors.notFound("githubData");

      const changedRecords = gitData.records.filter((record) => {
        return record.currentHash !== record.syncedHash;
      });
      const octokit = await ctx.fastify.github.getInstallationOctokit(
        gitData?.github.installationId
      );
      const additions: Array<{ path: string; contents: string }> = [];
      const lastCommits = await octokit.graphql<{
        repository: {
          object: {
            history: {
              nodes: Array<{
                oid: string;
                committedDate: string;
              }>;
            };
          };
        };
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
          owner: gitData.github.repositoryOwner,
          name: gitData.github.repositoryName,
          branch: gitData.github.branchName,
          since: gitData.lastCommitDate
        }
      );
      const recordsChanged = new Map<string, string[]>();

      for await (const commit of lastCommits.repository.object.history.nodes) {
        const commitData = await octokit.rest.repos.getCommit({
          owner: gitData.github.repositoryOwner,
          repo: gitData.github.repositoryName,
          ref: commit.oid
        });

        commitData.data.files?.forEach((file) => {
          const directory = file.filename.split("/").slice(0, -1).join("/");
          const fileName = file.filename.split("/").pop() || "";

          console.log(file);
          recordsChanged.set(
            directory,
            recordsChanged.get(directory)?.concat(fileName) || [fileName]
          );
        });
      }

      const changedFiles: Array<{
        path: string;
        content: string;
        status: "added" | "removed" | "modified";
      }> = [];

      for await (const [directory, files] of recordsChanged.entries()) {
        const directoryEntries = await getDirectoryEntries(directory, octokit, gitData.github);

        for await (const entry of directoryEntries) {
          if (entry.type === "blob" && files.includes(entry.name) && entry.object.text) {
            changedFiles.push({
              path: `${directory}/${entry.name}`,
              content: entry.object.text
            });
          }
        }
      }

      return { changedFiles, recordsChanged: [...recordsChanged.entries()] };
    }),
  commit: authenticatedProcedure
    .input(
      z.object({
        message: z.string()
      })
    )
    .output(z.any())
    .mutation(async ({ ctx, input }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const contentGroupsCollection = getContentGroupsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const workspaceCollection = getWorkspacesCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

      if (!gitData?.github) throw errors.notFound("githubData");

      const changedRecords = gitData.records.filter((record) => {
        return record.currentHash !== record.syncedHash;
      });
      const octokit = await ctx.fastify.github.getInstallationOctokit(
        gitData?.github.installationId
      );
      const additions: Array<{ path: string; contents: string }> = [];

      for await (const record of changedRecords) {
        const content = await contentsCollection.findOne({
          contentPieceId: record.contentPieceId
        });

        if (content && content.content) {
          additions.push({
            path: record.path.startsWith("/") ? record.path.slice(1) : record.path,
            contents: Buffer.from(
              gfmOutputTransformer(bufferToJSON(Buffer.from(content.content.buffer))).trim()
            ).toString("base64")
          });
        }
      }

      const result = await octokit.graphql<{
        createCommitOnBranch: {
          commit: {
            oid: string;
            committedDate: string;
          };
        };
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
              repositoryNameWithOwner: `${gitData.github.repositoryOwner}/${gitData.github.repositoryName}`,
              branchName: gitData.github.branchName
            },
            message: { headline: input.message },
            expectedHeadOid: gitData.lastCommitId,
            fileChanges: {
              additions,
              deletions: []
            }
          }
        }
      );

      await gitDataCollection.updateOne(
        { workspaceId: ctx.auth.workspaceId },
        {
          $set: {
            records: gitData.records.map((record) => ({
              ...record,
              syncedHash: record.currentHash
            })),
            lastCommitId: result.createCommitOnBranch.commit.oid,
            lastCommitDate: result.createCommitOnBranch.commit.committedDate
          }
        }
      );
    })
});

export { githubRouter };
