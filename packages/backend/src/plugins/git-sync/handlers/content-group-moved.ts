import { GitSyncHookProcessor, createGitSyncHandler } from "../utils";
import { ObjectId } from "mongodb";
import crypto from "node:crypto";
import {
  FullContentGroup,
  getContentGroupsCollection,
  getContentPiecesCollection,
  getContentsCollection
} from "#collections";
import { UnderscoreID } from "#lib/mongo";

type ContentGroupMovedData = {
  contentGroup: UnderscoreID<FullContentGroup<ObjectId>>;
  ancestor?: string | null;
};

const processContentGroupMoved: GitSyncHookProcessor<ContentGroupMovedData> = async (
  { ctx, directories, records, outputContentProcessor },
  data
) => {
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);

  let newDirectories = [...directories];
  let newRecords = [...records];

  const existingDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.contentGroup._id);
  });

  if (existingDirectory) {
    newDirectories = newDirectories.filter((directory) => {
      return !directory.path.startsWith(existingDirectory.path);
    });
    newRecords = newRecords.map((record) => {
      if (record.path.startsWith(existingDirectory.path)) {
        return {
          ...record,
          currentHash: ""
        };
      }

      return record;
    });
  }

  if (!data.ancestor) return { directories: newDirectories, records: newRecords };

  const ancestorDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.ancestor!);
  });

  if (!ancestorDirectory) return { directories: newDirectories, records: newRecords };

  const nestedContentGroups = (
    await contentGroupsCollection
      .find({
        workspaceId: ctx.auth.workspaceId,
        $or: [
          {
            ancestors: data.contentGroup._id
          },
          {
            _id: data.contentGroup._id
          }
        ]
      })
      .toArray()
  ).sort((contentGroupA, contentGroupB) => {
    // sort ascending by ancestors length
    if (contentGroupA.ancestors.length < contentGroupB.ancestors.length) return -1;
    if (contentGroupA.ancestors.length > contentGroupB.ancestors.length) return 1;

    return 0;
  });
  const contentPieces = await contentPiecesCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      contentGroupId: { $in: nestedContentGroups.map((contentGroup) => contentGroup._id) }
    })
    .toArray();
  const contents = await contentsCollection
    .find({
      contentPieceId: { $in: contentPieces.map((contentPiece) => contentPiece._id) }
    })
    .toArray();
  const outputContentProcessorBatch = [];

  for await (const contentGroup of nestedContentGroups) {
    const ancestorDirectory = newDirectories.find((directory) => {
      return directory.contentGroupId.equals(contentGroup.ancestors.at(-1)!);
    });

    if (!ancestorDirectory) continue;

    newDirectories.push({
      contentGroupId: contentGroup._id,
      path: ancestorDirectory.path
        .split("/")
        .concat(contentGroup.name || `${contentGroup._id}`)
        .filter(Boolean)
        .join("/")
    });

    for await (const contentPiece of contentPieces) {
      if (!contentPiece.contentGroupId.equals(contentGroup._id)) continue;

      const { content } =
        contents.find((content) => {
          return content.contentPieceId.equals(contentPiece._id);
        }) || {};

      if (!content) continue;

      outputContentProcessorBatch.push({
        content,
        contentPiece,
        contentGroup
      });
    }
  }

  const processedOutputContents = await outputContentProcessor.processBatch(
    outputContentProcessorBatch.map(({ content, contentPiece }) => {
      return {
        buffer: Buffer.from(content.buffer),
        contentPiece
      };
    })
  );

  outputContentProcessorBatch.forEach(({ contentPiece, contentGroup }, index) => {
    newRecords.push({
      contentPieceId: contentPiece._id,
      path: ancestorDirectory.path
        .split("/")
        .concat(
          contentGroup.name || `${contentGroup._id}`,
          contentPiece.filename || `${contentPiece._id}`
        )
        .filter(Boolean)
        .join("/"),
      currentHash: crypto.createHash("md5").update(processedOutputContents[index]).digest("hex"),
      syncedHash: ""
    });
  });

  return { directories: newDirectories, records: newRecords };
};
const handleContentGroupMoved =
  createGitSyncHandler<ContentGroupMovedData>(processContentGroupMoved);

export { processContentGroupMoved, handleContentGroupMoved };
