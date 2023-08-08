import { createSyncedPiece, processInputContent } from "./process-content";
import { LexoRank } from "lexorank";
import { ObjectId, Binary } from "mongodb";
import {
  FullGitData,
  getContentGroupsCollection,
  getContentPiecesCollection,
  getContentsCollection,
  getGitDataCollection,
  FullContentGroup,
  FullContentPiece,
  FullContents,
  GitRecord,
  GitDirectory
} from "#database";
import { AuthenticatedContext, UnderscoreID, errors } from "#lib";

interface PulledRecords {
  changedRecordsByDirectory: Map<
    string,
    Array<{ fileName: string; status: string; content?: string; hash: string }>
  >;
  lastCommitDate: string;
  lastCommitId: string;
}

const processPulledRecords = async (
  { changedRecordsByDirectory, lastCommitDate, lastCommitId }: PulledRecords,
  gitData: UnderscoreID<FullGitData<ObjectId>>,
  ctx: AuthenticatedContext
): Promise<{
  applyPull: () => Promise<void>;
  conflicts: Array<{
    path: string;
    contentPieceId: ObjectId;
    pulledContent: string;
    pulledHash: string;
  }>;
}> => {
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const gitDataCollection = getGitDataCollection(ctx.db);
  const newContentGroups: UnderscoreID<FullContentGroup<ObjectId>>[] = [];
  const updatedContentGroups: Pick<
    UnderscoreID<FullContentGroup<ObjectId>>,
    "_id" | "descendants"
  >[] = [];
  const newContentPieces: UnderscoreID<FullContentPiece<ObjectId>>[] = [];
  const newContents: UnderscoreID<FullContents<ObjectId>>[] = [];
  const updatedContentPieces: Array<
    { _id: ObjectId } & Partial<Partial<UnderscoreID<FullContentPiece<ObjectId>>>>
  > = [];
  const updatedContents: Array<
    { contentPieceId: ObjectId } & Partial<Partial<UnderscoreID<FullContents<ObjectId>>>>
  > = [];
  const removedContentPieces: ObjectId[] = [];
  const newRecords: Array<GitRecord<ObjectId>> = [...gitData.records];
  const newDirectories: Array<GitDirectory<ObjectId>> = [...gitData.directories];
  const conflicts: Array<{
    path: string;
    contentPieceId: ObjectId;
    pulledContent: string;
    pulledHash: string;
  }> = [];
  const createDirectory = async (
    path: string
  ): Promise<UnderscoreID<FullContentGroup<ObjectId>>> => {
    const directories = path.split("/");
    const parentDirectory = directories.slice(0, -1).join("/");
    const existingDirectory = newDirectories.find((directory) => directory.path === path);

    if (existingDirectory) {
      const ancestorContentGroup = await contentGroupsCollection.findOne({
        _id: existingDirectory.contentGroupId,
        workspaceId: ctx.auth.workspaceId
      });

      if (!ancestorContentGroup) throw errors.notFound("contentGroup");

      const contentGroup: UnderscoreID<FullContentGroup<ObjectId>> = {
        _id: new ObjectId(),
        workspaceId: ctx.auth.workspaceId,
        name: directories[directories.length - 1],
        ancestors: [...ancestorContentGroup.ancestors, ancestorContentGroup._id],
        descendants: []
      };

      updatedContentGroups.push({
        _id: ancestorContentGroup._id,
        descendants: [...ancestorContentGroup.descendants, contentGroup._id]
      });
      newContentGroups.push(contentGroup);
      newDirectories.push({
        path,
        contentGroupId: contentGroup._id
      });

      return contentGroup;
    }

    const ancestorContentGroup = await createDirectory(parentDirectory);
    const contentGroup: UnderscoreID<FullContentGroup<ObjectId>> = {
      _id: new ObjectId(),
      workspaceId: ctx.auth.workspaceId,
      name: directories[directories.length - 1],
      ancestors: [...ancestorContentGroup.ancestors, ancestorContentGroup._id],
      descendants: []
    };

    updatedContentGroups.push({
      _id: ancestorContentGroup._id,
      descendants: [...ancestorContentGroup.descendants, contentGroup._id]
    });
    ancestorContentGroup.descendants.push(contentGroup._id);
    newDirectories.push({
      path,
      contentGroupId: contentGroup._id
    });

    return contentGroup;
  };

  for await (const [directoryPath, changedRecords] of changedRecordsByDirectory.entries()) {
    if (changedRecords.some((changedRecord) => changedRecord.status !== "removed")) {
      const existingDirectory = newDirectories.find(
        (directory) => directory.path === directoryPath
      );

      if (!existingDirectory) {
        await createDirectory(directoryPath);
      }
    }
  }

  for await (const [directoryPath, changedRecords] of changedRecordsByDirectory.entries()) {
    for await (const changedRecord of changedRecords) {
      if (changedRecord.status === "removed") {
        const existingRecord = newRecords.find((record) => {
          return record.path === `${directoryPath}/${changedRecord.fileName}`;
        });

        if (existingRecord) {
          // TODO: fix
          // eslint-disable-next-line max-depth
          if (
            existingRecord.currentHash !== existingRecord.syncedHash &&
            existingRecord.syncedHash !== changedRecord.hash
          ) {
            conflicts.push({
              path: existingRecord.path,
              contentPieceId: existingRecord.contentPieceId,
              pulledContent: changedRecord.content || "",
              pulledHash: changedRecord.hash
            });
          }

          // eslint-disable-next-line max-depth
          if (existingRecord.currentHash === existingRecord.syncedHash) {
            newRecords.splice(newRecords.indexOf(existingRecord), 1);
            removedContentPieces.push(existingRecord.contentPieceId);
          }
        }
      } else {
        const existingRecord = newRecords.find((record) => {
          return record.path === `${directoryPath}/${changedRecord.fileName}`;
        });
        const { contentGroupId } =
          newDirectories.find((directory) => {
            return directory.path === directoryPath;
          }) || {};

        if (!contentGroupId) continue;

        if (existingRecord) {
          const { buffer, contentHash, metadata } = processInputContent(
            changedRecord.content || "",
            gitData.github!
          );
          const { date, members, tags, ...restMetadata } = metadata;

          // TODO: fix
          // eslint-disable-next-line max-depth
          if (
            existingRecord.currentHash !== existingRecord.syncedHash &&
            existingRecord.syncedHash !== changedRecord.hash
          ) {
            conflicts.push({
              path: existingRecord.path,
              contentPieceId: existingRecord.contentPieceId,
              pulledContent: changedRecord.content || "",
              pulledHash: changedRecord.hash
            });
          }

          // eslint-disable-next-line max-depth
          if (existingRecord.currentHash === existingRecord.syncedHash) {
            updatedContentPieces.push({
              _id: existingRecord.contentPieceId,
              ...restMetadata,
              ...(date && { date: new Date(date) }),
              ...(members && { members: members.map((memberId) => new ObjectId(memberId)) }),
              ...(tags && { tags: tags.map((tagId) => new ObjectId(tagId)) })
            });
            updatedContents.push({
              contentPieceId: existingRecord.contentPieceId,
              content: new Binary(buffer)
            });
            existingRecord.syncedHash = contentHash;
            existingRecord.currentHash = contentHash;
          }

          continue;
        }

        const [lastContentPiece] = await contentPiecesCollection
          .find({ contentGroupId })
          .sort({ order: -1 })
          .limit(1)
          .toArray();

        let order = "";

        if (lastContentPiece) {
          order = LexoRank.parse(lastContentPiece.order).genNext().toString();
        } else {
          order = LexoRank.min().toString();
        }

        const { content, contentHash, contentPiece } = createSyncedPiece(
          {
            content: changedRecord.content || "",
            path: `${directoryPath}/${changedRecord.fileName}`,
            workspaceId: ctx.auth.workspaceId,
            contentGroupId,
            order
          },
          gitData.github!
        );

        newContentPieces.push(contentPiece);
        newContents.push(content);
        newRecords.push({
          contentPieceId: contentPiece._id,
          path: `${directoryPath}/${changedRecord.fileName}`,
          currentHash: contentHash,
          syncedHash: contentHash
        });
      }
    }
  }

  const applyPull = async (): Promise<void> => {
    const contentPiecesChanges = [
      ...newContentPieces.map((contentPiece) => ({ insertOne: { document: contentPiece } })),
      ...updatedContentPieces.map(({ _id, ...contentPieceMetadata }) => ({
        updateOne: {
          filter: { _id },
          update: { $set: contentPieceMetadata }
        }
      })),
      ...removedContentPieces.map((contentPieceId) => ({
        deleteOne: {
          filter: { _id: contentPieceId }
        }
      }))
    ];
    const contentsChanges = [
      ...newContents.map((content) => ({ insertOne: { document: content } })),
      ...updatedContents.map((content) => ({
        updateOne: {
          filter: { contentPieceId: content.contentPieceId },
          update: { $set: { content: content.content } }
        }
      })),
      ...removedContentPieces.map((contentPieceId) => ({
        deleteOne: {
          filter: { contentPieceId }
        }
      }))
    ];
    const contentGroupsChanges = [
      ...newContentGroups.map((contentGroup) => ({ insertOne: { document: contentGroup } })),
      ...updatedContentGroups.map((contentGroup) => ({
        updateOne: {
          filter: { _id: contentGroup._id },
          update: { $set: { descendants: contentGroup.descendants } }
        }
      }))
    ];

    if (contentPiecesChanges.length) await contentPiecesCollection.bulkWrite(contentPiecesChanges);
    if (contentsChanges.length) await contentsCollection.bulkWrite(contentsChanges);
    if (contentGroupsChanges.length) await contentGroupsCollection.bulkWrite(contentGroupsChanges);

    await gitDataCollection.updateOne(
      {
        workspaceId: gitData.workspaceId
      },
      {
        $set: {
          directories: newDirectories,
          records: newRecords,
          lastCommitDate,
          lastCommitId
        }
      }
    );
  };

  return {
    applyPull,
    conflicts
  };
};

export { processPulledRecords };
