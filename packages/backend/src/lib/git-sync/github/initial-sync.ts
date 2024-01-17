import { getDirectory, getLastCommit } from "./requests";
import { ProcessInputResult, createInputContentProcessor } from "../process-content";
import { GitSyncConfiguration } from "../integration";
import { LexoRank } from "lexorank";
import { minimatch } from "minimatch";
import { Binary, ObjectId } from "mongodb";
import { convert as convertToSlug } from "url-slug";
import {
  FullContentGroup,
  FullContentPiece,
  FullContents,
  GitRecord,
  GitDirectory
} from "#collections";
import { errors } from "#lib/errors";
import { UnderscoreID } from "#lib/mongo";

type RawGitRecord = {
  path: string;
  order: string;
  hash: string;
  buffer: Buffer;
  metadata: ProcessInputResult["metadata"];
};
type RawGitDirectory = {
  path: string;
  name: string;
  directories: RawGitDirectory[];
  records: RawGitRecord[];
};

const initialSync: GitSyncConfiguration["initialSync"] = async ({ ctx, gitData }) => {
  if (!gitData?.github) throw errors.notFound("gitData");

  // Content Data
  const newContentGroups: UnderscoreID<FullContentGroup<ObjectId>>[] = [];
  const newContentPieces: UnderscoreID<FullContentPiece<ObjectId>>[] = [];
  const newContents: UnderscoreID<FullContents<ObjectId>>[] = [];
  const newRecords: Array<GitRecord<ObjectId>> = [];
  const newDirectories: Array<GitDirectory<ObjectId>> = [];
  // Setup
  const octokit = await ctx.fastify.github.getInstallationOctokit(gitData?.github.installationId);
  const inputContentProcessor = await createInputContentProcessor(ctx, gitData.github.transformer);

  let { baseDirectory } = gitData.github;

  if (baseDirectory.startsWith("/")) baseDirectory = baseDirectory.slice(1);

  // Latest commit
  const latestGitHubCommit = await getLastCommit({ octokit, githubData: gitData.github! });

  if (!latestGitHubCommit) throw errors.notFound("lastCommit");

  // GitHub Entries -> Raw Git Records
  const fetchRawGitData = async (): Promise<{
    rawGitDirectory: RawGitDirectory;
    rawGitDirectoriesByPath: Map<string, RawGitDirectory>;
    rawGitRecordsByPath: Map<string, RawGitRecord>;
  }> => {
    const rawGitDirectoriesByPath = new Map<string, RawGitDirectory>();
    const rawGitRecordsByPath = new Map<string, RawGitRecord>();
    const fetchRawGitDirectory = async (path: string): Promise<RawGitDirectory> => {
      const syncedPath = path.startsWith("/") ? path.slice(1) : path;
      const recordPath = path.replace(baseDirectory, "").split("/").filter(Boolean).join("/");
      const name = recordPath.split("/").pop() || gitData.github?.repositoryName || "";
      const rawGitRecords: RawGitRecord[] = [];
      const rawGitRecordsWithoutContent: Array<Omit<RawGitRecord, "buffer" | "hash" | "metadata">> =
        [];
      const rawGitRecordsContents = new Map<string, string>();
      const rawGitDirectories: RawGitDirectory[] = [];
      const entries = await getDirectory({
        githubData: gitData.github!,
        octokit,
        payload: { path: syncedPath }
      });

      let order = LexoRank.min();

      for await (const entry of entries) {
        if (entry.type === "tree") {
          const rawGitDirectory = await fetchRawGitDirectory(
            syncedPath.split("/").filter(Boolean).concat(entry.name).join("/")
          );

          rawGitDirectories.push(rawGitDirectory);
          rawGitDirectoriesByPath.set(rawGitDirectory.path, rawGitDirectory);
        } else if (
          entry.type === "blob" &&
          entry.object.text &&
          minimatch(entry.name, gitData.github!.matchPattern)
        ) {
          const path = [...recordPath.split("/"), entry.name].filter(Boolean).join("/");

          rawGitRecordsWithoutContent.push({
            order: `${order}`,
            path
          });
          rawGitRecordsContents.set(path, entry.object.text);
          order = order.genNext();
        }
      }

      for await (const rawGitRecordWithoutContent of rawGitRecordsWithoutContent) {
        const rawGitRecordContent = rawGitRecordsContents.get(rawGitRecordWithoutContent.path);

        if (rawGitRecordContent) {
          const { buffer, hash, metadata } =
            await inputContentProcessor.process(rawGitRecordContent);
          const rawGitRecord = {
            ...rawGitRecordWithoutContent,
            hash,
            buffer,
            metadata
          };

          rawGitRecords.push(rawGitRecord);
          rawGitRecordsByPath.set(rawGitRecord.path, rawGitRecord);
        }
      }

      return {
        records: rawGitRecords,
        directories: rawGitDirectories,
        path: syncedPath,
        name
      };
    };

    return {
      rawGitDirectory: await fetchRawGitDirectory(baseDirectory),
      rawGitDirectoriesByPath,
      rawGitRecordsByPath
    };
  };
  const rawGitData = await fetchRawGitData();
  // Raw Git Records -> Content Data
  const rawGitDirectoryToContentGroup = (
    rawGitDirectory: RawGitDirectory,
    ancestors: ObjectId[] = []
  ): UnderscoreID<FullContentGroup<ObjectId>> => {
    const contentGroupId = new ObjectId();
    const contentGroup = {
      _id: contentGroupId,
      ancestors,
      descendants: [] as ObjectId[],
      name: rawGitDirectory.name,
      workspaceId: ctx.auth.workspaceId
    };

    newContentGroups.push(contentGroup);
    newDirectories.push({
      contentGroupId,
      path: rawGitDirectory.path
    });
    rawGitDirectory.records.forEach((record) => {
      const filename = record.path.split("/").pop() || "";
      const { members, tags, date, ...inputMetadata } = record.metadata;
      const contentPiece: UnderscoreID<FullContentPiece<ObjectId>> = {
        _id: new ObjectId(),
        workspaceId: ctx.auth.workspaceId,
        order: record.order,
        members: [],
        slug: convertToSlug(filename),
        tags: [],
        title: filename,
        contentGroupId,
        filename,
        ...inputMetadata,
        ...(date && { date: new Date(date) }),
        ...(members && { members: members.map((memberId) => new ObjectId(memberId)) }),
        ...(tags && { tags: tags.map((tagId) => new ObjectId(tagId)) })
      };
      const content: UnderscoreID<FullContents<ObjectId>> = {
        _id: new ObjectId(),
        contentPieceId: contentPiece._id,
        content: new Binary(record.buffer)
      };

      newContentPieces.push(contentPiece);
      newContents.push(content);
      newRecords.push({
        contentPieceId: contentPiece._id,
        currentHash: record.hash,
        syncedHash: record.hash,
        path: record.path
      });
    });
    contentGroup.descendants = rawGitDirectory.directories
      .map((directory) => {
        return rawGitDirectoryToContentGroup(directory, [contentGroupId, ...ancestors]);
      })
      .map((contentGroup) => contentGroup._id);

    return contentGroup;
  };
  const topContentGroup = rawGitDirectoryToContentGroup(rawGitData.rawGitDirectory);

  return {
    newContentGroups,
    newContentPieces,
    newContents,
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
