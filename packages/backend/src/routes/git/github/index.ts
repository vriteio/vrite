import { createSyncedPiece, processInputContent, processOutputContent } from "./process-content";
import {
  commitChanges,
  getCommitsSince,
  getFilesChangedInCommit,
  getLastCommit,
  getDirectory
} from "./requests";
import { processPulledRecords } from "./pull";
import { publishEvent } from "../events";
import { z } from "zod";
import { LexoRank } from "lexorank";
import { Binary } from "mongodb";
import crypto from "node:crypto";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import * as errors from "#lib/errors";
import {
  FullContentGroup,
  FullContentPiece,
  FullContents,
  FullGitData,
  GitDirectory,
  GitRecord,
  getContentGroupsCollection,
  getContentPiecesCollection,
  getContentsCollection,
  getGitDataCollection,
  getWorkspacesCollection,
  githubData
} from "#database";
import { ObjectId, UnderscoreID, zodId } from "#lib";

const authenticatedProcedure = procedure.use(isAuthenticated);
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
        directories: [],
        provider: "github",
        workspaceId: ctx.auth.workspaceId
      };

      await gitDataCollection.insertOne(gitData);
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "configure",
        data: {
          github: input,
          records: [],
          directories: [],
          provider: "github",
          id: `${gitData._id}`
        }
      });
    }),
  initialSync: authenticatedProcedure
    .input(z.void())
    .output(z.void())
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
      const newDirectories: Array<GitDirectory<ObjectId>> = [];
      const octokit = await ctx.fastify.github.getInstallationOctokit(
        gitData?.github.installationId
      );
      const syncDirectory = async (path: string, ancestors: ObjectId[]): Promise<ObjectId> => {
        const entries = await getDirectory({
          githubData: gitData.github!,
          octokit,
          payload: { path }
        });
        const name = path.split("/").pop() || gitData.github?.repositoryName || "";
        const contentGroupId = new ObjectId();
        const descendants: ObjectId[] = [];

        let order = LexoRank.min();

        for await (const entry of entries) {
          if (entry.type === "tree") {
            const id = await syncDirectory(
              path.split("/").filter(Boolean).concat(entry.name).join("/"),
              [...ancestors, contentGroupId]
            );

            descendants.push(id);
          } else if (entry.type === "blob" && entry.object.text) {
            const { content, contentHash, contentPiece } = createSyncedPiece(
              {
                content: entry.object.text,
                path: `${path}/${entry.name}`,
                workspaceId: ctx.auth.workspaceId,
                contentGroupId,
                order: order.toString()
              },
              gitData.github!
            );

            order = order.genNext();
            newContentPieces.push(contentPiece);
            newContents.push(content);
            newRecords.push({
              contentPieceId: contentPiece._id,
              currentHash: contentHash,
              syncedHash: contentHash,
              path: `${path.startsWith("/") ? path.slice(1) : path}/${entry.name}`
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
        newDirectories.push({
          path: path.startsWith("/") ? path.slice(1) : path,
          contentGroupId
        });

        return contentGroup._id;
      };
      const id = await syncDirectory("", []);

      await contentGroupsCollection.insertMany(newContentGroups);
      await contentPiecesCollection.insertMany(newContentPieces);
      await contentsCollection.insertMany(newContents);

      const lastCommit = await getLastCommit({ octokit, githubData: gitData.github! });

      if (!lastCommit) throw errors.notFound("lastCommit");

      await gitDataCollection.updateOne(
        { workspaceId: ctx.auth.workspaceId },
        {
          $set: {
            records: newRecords,
            directories: newDirectories,
            contentGroupId: id,
            lastCommitDate: lastCommit.committedDate,
            lastCommitId: lastCommit.oid
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
          directories: newDirectories.map((directory) => ({
            ...directory,
            contentGroupId: `${directory.contentGroupId}`
          })),
          lastCommitDate: lastCommit.committedDate,
          lastCommitId: lastCommit.oid
        }
      });
    }),
  pull: authenticatedProcedure
    .input(
      z.object({
        force: z.boolean().optional()
      })
    )
    .output(
      z.object({
        status: z.enum(["pulled", "conflict"]),
        conflicted: z
          .array(
            z.object({
              path: z.string(),
              contentPieceId: zodId(),
              currentContent: z.string(),
              pulledContent: z.string(),
              pulledHash: z.string()
            })
          )
          .optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

      if (!gitData?.github) throw errors.notFound("githubData");

      const octokit = await ctx.fastify.github.getInstallationOctokit(
        gitData?.github.installationId
      );
      const changedRecordsByDirectory = new Map<
        string,
        Array<{ fileName: string; status: string; content?: string; hash: string }>
      >();
      const lastCommits = await getCommitsSince({
        payload: { since: gitData.lastCommitDate! },
        githubData: gitData.github!,
        octokit
      });

      for await (const commit of lastCommits) {
        const filesChangedInCommit = await getFilesChangedInCommit({
          payload: { commitId: commit.oid },
          githubData: gitData.github!,
          octokit
        });

        filesChangedInCommit.forEach((file) => {
          const directory = file.filename.split("/").slice(0, -1).join("/");
          const fileName = file.filename.split("/").pop() || "";
          const { status } = file;
          const directoryRecords = changedRecordsByDirectory.get(directory) || [];
          const existingRecordIndex = directoryRecords.findIndex(
            (record) => record.fileName === fileName
          );

          if (existingRecordIndex === -1) {
            directoryRecords.push({ fileName, status, hash: "" });
          } else {
            directoryRecords[existingRecordIndex].status = status;
          }

          changedRecordsByDirectory.set(directory, directoryRecords);
        });
      }

      for await (const [directory, files] of changedRecordsByDirectory.entries()) {
        const directoryEntries = await getDirectory({
          githubData: gitData.github!,
          octokit,
          payload: { path: directory }
        });

        for await (const entry of directoryEntries) {
          const file = files.find((file) => file.fileName === entry.name);

          if (entry.type === "blob" && file && entry.object.text) {
            file.content = entry.object.text;
            file.hash = crypto.createHash("md5").update(entry.object.text).digest("hex");
          }
        }
      }

      const latestCommit = lastCommits.at(-1) || {
        committedDate: gitData.lastCommitDate || "",
        oid: gitData.lastCommitId || ""
      };
      const { applyPull, conflicts } = await processPulledRecords(
        {
          changedRecordsByDirectory,
          lastCommitDate: latestCommit.committedDate,
          lastCommitId: latestCommit.oid
        },
        gitData,
        ctx
      );

      if (conflicts.length && !input.force) {
        const contentPieceIds = conflicts.map((conflict) => conflict.contentPieceId);
        const contentPieces = await contentPiecesCollection
          .find({ _id: { $in: contentPieceIds } })
          .toArray();
        const contents = await contentsCollection
          .find({ contentPieceId: { $in: contentPieceIds } })
          .toArray();

        return {
          status: "conflict",
          conflicted: conflicts
            .map((conflict) => {
              const contentPiece = contentPieces.find(
                (contentPiece) => `${contentPiece._id}` === `${conflict.contentPieceId}`
              );
              const { content } =
                contents.find(
                  (content) => `${content.contentPieceId}` === `${conflict.contentPieceId}`
                ) || {};

              if (!contentPiece || !content) return null;

              const { date, members, tags, description, ...metadata } = contentPiece;

              return {
                path: conflict.path,
                contentPieceId: `${conflict.contentPieceId}`,
                currentContent: processOutputContent(
                  Buffer.from(content.buffer),
                  contentPiece,
                  gitData.github!
                ),
                pulledContent: conflict.pulledContent,
                pulledHash: conflict.pulledHash
              };
            })
            .filter(Boolean) as Array<{
            path: string;
            contentPieceId: string;
            currentContent: string;
            pulledContent: string;
            pulledHash: string;
          }>
        };
      }

      await applyPull();

      return { status: "pulled" };
    }),
  commit: authenticatedProcedure
    .input(
      z.object({
        message: z.string()
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

      if (!gitData?.github) throw errors.notFound("githubData");

      const changedRecords = gitData.records.filter((record) => {
        return record.currentHash !== record.syncedHash;
      });
      const octokit = await ctx.fastify.github.getInstallationOctokit(
        gitData?.github.installationId
      );
      const additions: Array<{ path: string; contents: string }> = [];
      const deletions: Array<{ path: string }> = [];

      for await (const record of changedRecords) {
        const { content } =
          (await contentsCollection.findOne({
            contentPieceId: record.contentPieceId
          })) || {};
        const contentPiece = await contentPiecesCollection.findOne({
          _id: record.contentPieceId
        });

        if (record.currentHash === "") {
          deletions.push({
            path: record.path.startsWith("/") ? record.path.slice(1) : record.path
          });

          continue;
        }

        if (content && contentPiece) {
          additions.push({
            path: record.path.startsWith("/") ? record.path.slice(1) : record.path,
            contents: Buffer.from(
              processOutputContent(Buffer.from(content.buffer), contentPiece, gitData.github!)
            ).toString("base64")
          });
        }
      }

      const commit = await commitChanges({
        githubData: gitData.github!,
        octokit,
        payload: {
          additions,
          deletions,
          message: input.message,
          expectedCommitId: gitData.lastCommitId!
        }
      });

      if (!commit) throw errors.serverError();

      await gitDataCollection.updateOne(
        { workspaceId: ctx.auth.workspaceId },
        {
          $set: {
            records: gitData.records
              .filter((record) => {
                return record.currentHash;
              })
              .map((record) => ({
                ...record,
                syncedHash: record.currentHash
              })),
            lastCommitId: commit.oid,
            lastCommitDate: commit.committedDate
          }
        }
      );
    }),
  getConflictedContent: authenticatedProcedure
    .input(
      z.object({
        contentPieceId: zodId()
      })
    )
    .output(
      z.object({
        content: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

      if (!gitData?.github) throw errors.notFound("githubData");

      const contentPiece = await contentPiecesCollection.findOne({
        _id: new ObjectId(input.contentPieceId)
      });

      if (!contentPiece) throw errors.notFound("contentPiece");

      const { content } =
        (await contentsCollection.findOne({
          contentPieceId: new ObjectId(input.contentPieceId)
        })) || {};

      if (!content) throw errors.notFound("content");

      return {
        content: processOutputContent(Buffer.from(content.buffer), contentPiece, gitData.github!)
      };
    }),
  resolveConflict: authenticatedProcedure
    .input(
      z.object({
        contentPieceId: z.string(),
        content: z.string(),
        syncedHash: z.string(),
        path: z.string()
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

      if (!gitData?.github) throw errors.notFound("githubData");

      const { buffer, metadata, contentHash } = processInputContent(input.content, gitData.github!);
      const { date, members, tags, ...restMetadata } = metadata;

      await contentsCollection.updateOne(
        {
          contentPieceId: new ObjectId(input.contentPieceId)
        },
        {
          $set: {
            content: new Binary(buffer)
          }
        }
      );
      await contentPiecesCollection.updateOne(
        {
          _id: new ObjectId(input.contentPieceId)
        },
        {
          $set: {
            ...restMetadata,
            ...(date && { date: new Date(date) }),
            ...(members && { members: members.map((memberId) => new ObjectId(memberId)) }),
            ...(tags && { tags: tags.map((tagId) => new ObjectId(tagId)) })
          }
        }
      );
      await gitDataCollection.updateOne(
        {
          "workspaceId": ctx.auth.workspaceId,
          "records.contentPieceId": new ObjectId(input.contentPieceId)
        },
        {
          $set: {
            "records.$.syncedHash": input.syncedHash,
            "records.$.currentHash": contentHash
          }
        }
      );
    })
});

export { githubRouter };
