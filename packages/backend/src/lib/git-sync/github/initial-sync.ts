import { getDirectory, getLastCommit } from "./requests";
import { createInputContentProcessor } from "../process-content";
import { createSyncedPieces } from "../synced-pieces";
import { GitSyncConfiguration } from "../integration";
import { LexoRank } from "lexorank";
import { minimatch } from "minimatch";
import { ObjectId } from "mongodb";
import {
  FullContentGroup,
  FullContentPiece,
  FullContents,
  GitRecord,
  GitDirectory,
  FullContentPieceVariant,
  FullContentVariant
} from "#collections";
import { errors } from "#lib/errors";
import { UnderscoreID } from "#lib/mongo";

const initialSync: GitSyncConfiguration["initialSync"] = async ({ ctx, gitData }) => {
  if (!gitData?.github) throw errors.notFound("gitData");

  const newContentGroups: UnderscoreID<FullContentGroup<ObjectId>>[] = [];
  const newContentPieces: UnderscoreID<FullContentPiece<ObjectId>>[] = [];
  const newContentPieceVariants: UnderscoreID<FullContentPieceVariant<ObjectId>>[] = [];
  const newContents: UnderscoreID<FullContents<ObjectId>>[] = [];
  const newContentVariants: UnderscoreID<FullContentVariant<ObjectId>>[] = [];
  const newRecords: Array<GitRecord<ObjectId>> = [];
  const newDirectories: Array<GitDirectory<ObjectId>> = [];
  const octokit = await ctx.fastify.github.getInstallationOctokit(gitData?.github.installationId);
  const { baseDirectory } = gitData.github;
  const basePath = baseDirectory.startsWith("/") ? baseDirectory.slice(1) : baseDirectory;
  const inputContentProcessor = await createInputContentProcessor(ctx, gitData.github.transformer);
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
    const createSyncedPiecesSource: Array<{
      path: string;
      content: string;
      workspaceId: ObjectId;
      contentGroupId: ObjectId;
      order: string;
    }> = [];

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
        createSyncedPiecesSource.push({
          content: entry.object.text,
          path: [...recordPath.split("/"), entry.name].filter(Boolean).join("/"),
          workspaceId: ctx.auth.workspaceId,
          contentGroupId,
          order: order.toString()
        });
        order = order.genNext();
      }
    }

    const syncedPieces = await createSyncedPieces(createSyncedPiecesSource, inputContentProcessor);

    syncedPieces.forEach(({ contentPiece, content, contentHash }, index) => {
      const { path } = createSyncedPiecesSource[index];

      newContentPieces.push(contentPiece);
      newContents.push(content);
      newRecords.push({
        contentPieceId: contentPiece._id,
        currentHash: contentHash,
        syncedHash: contentHash,
        path
      });
    });

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
  const latestGitHubCommit = await getLastCommit({ octokit, githubData: gitData.github! });

  if (!latestGitHubCommit) throw errors.notFound("lastCommit");

  return {
    newContentGroups,
    newContentPieces,
    newContentPieceVariants,
    newContents,
    newContentVariants,
    newRecords,
    newDirectories,
    topContentGroup,
    lastCommit: {
      date: latestGitHubCommit.committedDate,
      id: latestGitHubCommit.oid
    }
  };
};

export { initialSync };
