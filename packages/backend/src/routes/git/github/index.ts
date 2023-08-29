import {
  createSyncedPiece,
  createInputContentProcessor,
  createOutputContentProcessor
} from "./process-content";
import {
  commitChanges,
  getCommitsSince,
  getFilesChangedInCommit,
  getLastCommit,
  getDirectory
} from "./requests";
import { processPulledRecords } from "./pull";
import { publishGitDataEvent } from "../events";
import { z } from "zod";
import { LexoRank } from "lexorank";
import { Binary } from "mongodb";
import { minimatch } from "minimatch";
import crypto from "node:crypto";
import { AuthenticatedContext, isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import * as errors from "#lib/errors";
import {
  FullContentGroup,
  FullContentPiece,
  FullContents,
  FullGitData,
  GitDirectory,
  GitRecord,
  WorkspaceSettings,
  getContentGroupsCollection,
  getContentPiecesCollection,
  getContentsCollection,
  getGitDataCollection,
  getWorkspaceSettingsCollection,
  getWorkspacesCollection,
  githubData
} from "#database";
import { ObjectId, UnderscoreID, zodId } from "#lib";
import { publishContentGroupEvent } from "#routes/content-groups";
import { publishWorkspaceSettingsEvent } from "#routes/workspace-settings";

const authenticatedProcedure = procedure.use(isAuthenticated);
const enableFilenameMetadata = async (ctx: AuthenticatedContext): Promise<void> => {
  const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
  const workspaceSettings = await workspaceSettingsCollection.findOne({
    workspaceId: ctx.auth.workspaceId
  });

  if (!workspaceSettings || workspaceSettings.metadata?.enabledFields?.includes("filename")) return;

  const metadata: WorkspaceSettings["metadata"] = {
    ...(workspaceSettings.metadata || {}),
    enabledFields: [
      ...(workspaceSettings.metadata?.enabledFields || [
        "slug",
        "canonical-link",
        "date",
        "tags",
        "members"
      ]),
      "filename"
    ]
  };

  await workspaceSettingsCollection.updateOne(
    { _id: ctx.auth.workspaceId },
    {
      $set: {
        metadata
      }
    }
  );
  publishWorkspaceSettingsEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: { metadata }
  });
};
const githubRouter = router({
  configure: authenticatedProcedure
    .meta({
      permissions: { session: ["manageGit"] }
    })
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
      enableFilenameMetadata(ctx);
      publishGitDataEvent(ctx, `${ctx.auth.workspaceId}`, {
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
    .meta({
      permissions: { session: ["manageGit"] }
    })
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
      const { baseDirectory } = gitData.github;
      const basePath = baseDirectory.startsWith("/") ? baseDirectory.slice(1) : baseDirectory;
      const syncDirectory = async (
        path: string,
        ancestors: ObjectId[]
      ): Promise<UnderscoreID<FullContentGroup<ObjectId>>> => {
        const syncedPath = path.startsWith("/") ? path.slice(1) : path;
        const recordPath = path.replace(basePath, "").split("/").filter(Boolean).join("/");
        const entries = await getDirectory({
          githubData: gitData.github!,
          octokit,
          payload: { path: syncedPath }
        });
        const name = recordPath.split("/").pop() || gitData.github?.repositoryName || "";
        const contentGroupId = new ObjectId();
        const descendants: ObjectId[] = [];

        let order = LexoRank.min();

        for await (const entry of entries) {
          if (entry.type === "tree") {
            const descendantContentGroup = await syncDirectory(
              syncedPath.split("/").filter(Boolean).concat(entry.name).join("/"),
              [...ancestors, contentGroupId]
            );

            descendants.push(descendantContentGroup._id);
          } else if (
            entry.type === "blob" &&
            entry.object.text &&
            minimatch(entry.name, gitData.github!.matchPattern)
          ) {
            const processInputContent = await createInputContentProcessor(ctx);
            const { content, contentHash, contentPiece } = await createSyncedPiece(
              {
                content: entry.object.text,
                path: [...recordPath.split("/"), entry.name].filter(Boolean).join("/"),
                workspaceId: ctx.auth.workspaceId,
                contentGroupId,
                order: order.toString()
              },
              gitData.github!,
              processInputContent
            );

            order = order.genNext();
            newContentPieces.push(contentPiece);
            newContents.push(content);
            newRecords.push({
              contentPieceId: contentPiece._id,
              currentHash: contentHash,
              syncedHash: contentHash,
              path: [...recordPath.split("/"), entry.name].filter(Boolean).join("/")
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
          path: recordPath,
          contentGroupId
        });

        return contentGroup;
      };
      const topContentGroup = await syncDirectory(basePath, []);

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
            contentGroupId: topContentGroup._id,
            lastCommitDate: lastCommit.committedDate,
            lastCommitId: lastCommit.oid
          }
        }
      );
      await workspaceCollection.updateOne(
        { _id: ctx.auth.workspaceId },
        {
          $push: { contentGroups: topContentGroup._id }
        }
      );
      publishGitDataEvent(ctx, `${ctx.auth.workspaceId}`, {
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
      publishContentGroupEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "create",
        data: {
          ...topContentGroup,
          ancestors: topContentGroup.ancestors.map((ancestor) => `${ancestor}`),
          descendants: topContentGroup.descendants.map((descendant) => `${descendant}`),
          id: `${topContentGroup._id}`
        }
      });

      const bulkUpsertDetails: Array<{
        contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
        content: Buffer;
      }> = [];

      newContentPieces.forEach((contentPiece) => {
        const { content } =
          newContents.find(({ contentPieceId }) => {
            return contentPieceId.equals(contentPiece._id);
          }) || {};

        if (content) {
          bulkUpsertDetails.push({
            contentPiece,
            content: Buffer.from(content.buffer)
          });
        }
      });
      ctx.fastify.search.bulkUpsertContent(bulkUpsertDetails);
    }),
  pull: authenticatedProcedure
    .meta({
      permissions: { session: ["manageGit"] }
    })
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
      const { baseDirectory } = gitData.github!;
      const basePath = baseDirectory.startsWith("/") ? baseDirectory.slice(1) : baseDirectory;

      for await (const commit of lastCommits) {
        const filesChangedInCommit = await getFilesChangedInCommit({
          payload: { commitId: commit.oid },
          githubData: gitData.github!,
          octokit
        });

        filesChangedInCommit.forEach((file) => {
          if (
            !file.filename.startsWith(basePath) ||
            !minimatch(file.filename, gitData.github!.matchPattern)
          ) {
            return;
          }

          const recordPath = file.filename
            .replace(basePath, "")
            .split("/")
            .filter(Boolean)
            .join("/");
          const directory = recordPath.split("/").slice(0, -1).join("/");
          const fileName = recordPath.split("/").pop() || "";
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
          payload: {
            path: [...basePath.split("/"), ...directory.split("/")].filter(Boolean).join("/")
          }
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
        const processOutputContent = await createOutputContentProcessor(ctx);
        const contentPieceIds = conflicts.map((conflict) => conflict.contentPieceId);
        const contentPieces = await contentPiecesCollection
          .find({ _id: { $in: contentPieceIds } })
          .toArray();
        const contents = await contentsCollection
          .find({ contentPieceId: { $in: contentPieceIds } })
          .toArray();

        return {
          status: "conflict",
          conflicted: await Promise.all(
            conflicts
              .map(async (conflict) => {
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
                  currentContent: await processOutputContent(
                    Buffer.from(content.buffer),
                    contentPiece,
                    gitData.github!
                  ),
                  pulledContent: conflict.pulledContent,
                  pulledHash: conflict.pulledHash
                };
              })
              .filter(Boolean) as Array<
              Promise<{
                path: string;
                contentPieceId: string;
                currentContent: string;
                pulledContent: string;
                pulledHash: string;
              }>
            >
          )
        };
      }

      await applyPull();

      return { status: "pulled" };
    }),
  commit: authenticatedProcedure
    .meta({
      permissions: { session: ["manageGit"] }
    })
    .input(
      z.object({
        message: z.string()
      })
    )
    .output(
      z.object({
        status: z.enum(["stale-data", "committed"])
      })
    )
    .mutation(async ({ ctx, input }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const contentsCollection = getContentsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

      if (!gitData?.github) throw errors.notFound("githubData");

      const processOutputContent = await createOutputContentProcessor(ctx);
      const changedRecords = gitData.records.filter((record) => {
        return record.currentHash !== record.syncedHash;
      });
      const octokit = await ctx.fastify.github.getInstallationOctokit(
        gitData?.github.installationId
      );
      const { baseDirectory } = gitData.github!;
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

        if (record.currentHash === "" && minimatch(record.path, gitData.github.matchPattern)) {
          deletions.push({
            path: record.path.startsWith("/") ? record.path.slice(1) : record.path
          });

          continue;
        }

        if (content && contentPiece && minimatch(record.path, gitData.github.matchPattern)) {
          additions.push({
            path: record.path.startsWith("/") ? record.path.slice(1) : record.path,
            contents: Buffer.from(
              await processOutputContent(Buffer.from(content.buffer), contentPiece, gitData.github!)
            ).toString("base64")
          });
        }
      }

      const commit = await commitChanges({
        githubData: gitData.github!,
        octokit,
        payload: {
          additions: additions.map((addition) => {
            return {
              ...addition,
              path: [...baseDirectory.split("/"), ...addition.path.split("/")]
                .filter(Boolean)
                .join("/")
            };
          }),
          deletions: deletions.map((deletion) => {
            return {
              ...deletion,
              path: [...baseDirectory.split("/"), ...deletion.path.split("/")]
                .filter(Boolean)
                .join("/")
            };
          }),
          message: input.message,
          expectedCommitId: gitData.lastCommitId!
        }
      });

      if (!commit) throw errors.serverError();
      if (commit.status === "stale-data") return { status: "stale-data" };

      const outputRecords = gitData.records
        .filter((record) => {
          return record.currentHash;
        })
        .map((record) => ({
          ...record,
          syncedHash: record.currentHash
        }));

      await gitDataCollection.updateOne(
        { workspaceId: ctx.auth.workspaceId },
        {
          $set: {
            records: outputRecords,
            lastCommitId: commit.oid,
            lastCommitDate: commit.committedDate
          }
        }
      );
      publishGitDataEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "update",
        data: {
          records: outputRecords.map((record) => ({
            ...record,
            contentPieceId: `${record.contentPieceId}`
          }))
        }
      });

      return { status: "committed" };
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

      const processOutputContent = await createOutputContentProcessor(ctx);
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
        content: await processOutputContent(
          Buffer.from(content.buffer),
          contentPiece,
          gitData.github!
        )
      };
    }),
  resolveConflict: authenticatedProcedure
    .meta({
      permissions: { session: ["manageGit"] }
    })
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

      const processInputContent = await createInputContentProcessor(ctx);
      const { buffer, metadata, contentHash } = await processInputContent(
        input.content,
        gitData.github!
      );
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
      publishGitDataEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "update",
        data: {
          records: gitData.records.map((record) => {
            if (`${record.contentPieceId}` === input.contentPieceId) {
              return {
                ...record,
                contentPieceId: `${record.contentPieceId}`,
                syncedHash: input.syncedHash,
                currentHash: contentHash
              };
            }

            return { ...record, contentPieceId: `${record.contentPieceId}` };
          })
        }
      });
    })
});

export { githubRouter };
