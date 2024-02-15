import { z } from "zod";
import { LexoRank } from "lexorank";
import { ObjectId, Binary, AnyBulkWriteOperation } from "mongodb";
import { convert as convertToSlug } from "url-slug";
import {
  FullGitData,
  getContentGroupsCollection,
  FullContentGroup,
  FullContentPiece,
  FullContents,
  GitRecord,
  GitDirectory,
  getGitDataCollection,
  getContentsCollection,
  getContentPiecesCollection
} from "#collections";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID, zodId } from "#lib/mongo";
import {
  createOutputContentProcessor,
  useGitProvider,
  OutputContentProcessorInput,
  createInputContentProcessor,
  ProcessInputResult,
  CommonGitProviderCommit,
  CommonGitProviderRecord,
  UseGitProvider
} from "#lib/git-sync";

interface PulledRecords {
  changedRecordsByDirectory: Map<string, CommonGitProviderRecord[]>;
  lastCommit: CommonGitProviderCommit;
}

const inputSchema = z.object({
  force: z.boolean().optional().describe("Force pull")
});
const outputSchema = z.object({
  status: z.enum(["pulled", "conflict"]).describe("Status of the pull operation"),
  conflicted: z
    .array(
      z.object({
        path: z.string().describe("Path of the conflicted record, relative to the base directory"),
        contentPieceId: zodId().describe("ID of the associated content piece"),
        currentContent: z.string().describe("Current content"),
        pulledContent: z.string().describe("Pulled content"),
        pulledHash: z.string().describe("Hash of the pulled content")
      })
    )
    .describe("Conflicted records")
    .optional()
});
const processPulledRecords = async ({
  changedRecordsByDirectory,
  gitProvider,
  lastCommit,
  gitData,
  ctx,
  transformer
}: PulledRecords & {
  gitData: UnderscoreID<FullGitData<ObjectId>>;
  gitProvider: ReturnType<UseGitProvider>;
  ctx: AuthenticatedContext;
  transformer: string;
}): Promise<{
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
  const removedContentData: Array<{ contentPieceId: ObjectId }> = [];
  const newRecords: Array<GitRecord<ObjectId>> = [...gitData.records];
  const newDirectories: Array<GitDirectory<ObjectId>> = [...gitData.directories];
  const conflicts: Array<{
    path: string;
    contentPieceId: ObjectId;
    pulledContent: string;
    pulledHash: string;
  }> = [];
  const inputContentProcessor = await createInputContentProcessor(ctx, transformer);

  let { baseDirectory } = gitProvider.data;

  if (baseDirectory.startsWith("/")) baseDirectory = baseDirectory.slice(1);

  const createDirectory = async (
    path: string
  ): Promise<UnderscoreID<FullContentGroup<ObjectId>>> => {
    const processedPath = path;
    const directories = processedPath.split("/");
    const parentDirectory = directories.slice(0, -1).join("/");
    const existingDirectory = newDirectories.find(
      (directory) => directory.path === parentDirectory
    );

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
        path: processedPath,
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
      path: processedPath,
      contentGroupId: contentGroup._id
    });

    return contentGroup;
  };
  const createSyncedPiecesSources: Array<{
    path: string;
    content: string;
    workspaceId: ObjectId;
    contentGroupId: ObjectId;
    order: string;
  }> = [];

  // Create new directories/content groups
  for await (const [directoryPath, changedRecords] of changedRecordsByDirectory.entries()) {
    const processedDirectoryPath = directoryPath;

    if (changedRecords.some((changedRecord) => changedRecord.status !== "removed")) {
      const existingDirectory = newDirectories.find((directory) => {
        return directory.path === processedDirectoryPath;
      });

      if (!existingDirectory) {
        await createDirectory(directoryPath);
      }
    }
  }

  // Create/update/remove records/content pieces and contents
  for await (const [directoryPath, changedRecords] of changedRecordsByDirectory.entries()) {
    for await (const changedRecord of changedRecords) {
      // Remove
      if (changedRecord.status === "removed") {
        const existingRecord = newRecords.find((record) => {
          return record.path === changedRecord.path;
        });

        if (!existingRecord) continue;

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

        if (existingRecord.currentHash !== existingRecord.syncedHash) continue;

        newRecords.splice(newRecords.indexOf(existingRecord), 1);
        removedContentData.push({ contentPieceId: existingRecord.contentPieceId });

        continue;
      }

      const existingRecord = newRecords.find((record) => {
        return record.path === changedRecord.path;
      });
      const { contentGroupId } =
        newDirectories.find((directory) => {
          return directory.path === directoryPath;
        }) || {};

      if (!contentGroupId) continue;

      if (existingRecord) {
        const { buffer, hash, metadata } = await inputContentProcessor.process(
          changedRecord.content || ""
        );
        const { date, members, tags, ...restMetadata } = metadata;

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
          existingRecord.syncedHash = hash;
          existingRecord.currentHash = hash;
        }

        continue;
      }

      // Create new record
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

      createSyncedPiecesSources.push({
        content: changedRecord.content || "",
        path: changedRecord.path,
        workspaceId: ctx.auth.workspaceId,
        contentGroupId,
        order
      });
    }
  }

  const processedContents = await inputContentProcessor.processBatch(
    createSyncedPiecesSources.map(({ content }) => content)
  );
  const contentPiecesToProcess: Array<{
    path: string;
    content: string;
    workspaceId: ObjectId;
    contentGroupId: ObjectId;
    order: string;
    buffer: Buffer;
    hash: string;
    metadata: ProcessInputResult["metadata"];
  }> = [];

  createSyncedPiecesSources.forEach((createSyncedPiecesSource, index) => {
    const processedContent = processedContents[index];

    contentPiecesToProcess.push({
      ...createSyncedPiecesSource,
      ...processedContent
    });
  });
  contentPiecesToProcess.forEach((contentPieceToProcess) => {
    const { members, tags, date, ...inputMetadata } = contentPieceToProcess.metadata;
    const filename = contentPieceToProcess.path.split("/").pop() || "";
    const contentPieceId = new ObjectId();

    newContentPieces.push({
      _id: contentPieceId,
      workspaceId: ctx.auth.workspaceId,
      contentGroupId: contentPieceToProcess.contentGroupId,
      order: contentPieceToProcess.order,
      members: [],
      slug: convertToSlug(filename),
      tags: [],
      title: filename,
      filename,
      ...inputMetadata,
      ...(date && { date: new Date(date) }),
      ...(members && { members: members.map((memberId) => new ObjectId(memberId)) }),
      ...(tags && { tags: tags.map((tagId) => new ObjectId(tagId)) })
    });
    newContents.push({
      _id: new ObjectId(),
      contentPieceId,
      content: new Binary(contentPieceToProcess.buffer)
    });
    newRecords.push({
      contentPieceId,
      currentHash: contentPieceToProcess.hash,
      syncedHash: contentPieceToProcess.hash,
      path: contentPieceToProcess.path
    });
  });

  const applyPull = async (): Promise<void> => {
    const contentPiecesChanges: AnyBulkWriteOperation<UnderscoreID<FullContentPiece<ObjectId>>>[] =
      [
        ...newContentPieces.map((contentPiece) => ({ insertOne: { document: contentPiece } })),
        ...updatedContentPieces.map(({ _id, ...contentPieceMetadata }) => ({
          updateOne: {
            filter: { _id },
            update: { $set: contentPieceMetadata }
          }
        })),
        ...removedContentData.map(({ contentPieceId }) => ({
          deleteOne: {
            filter: { _id: contentPieceId }
          }
        }))
      ];
    const contentsChanges: AnyBulkWriteOperation<UnderscoreID<FullContents<ObjectId>>>[] = [
      ...newContents.map((content) => ({ insertOne: { document: content } })),
      ...updatedContents.map((content) => ({
        updateOne: {
          filter: { contentPieceId: content.contentPieceId },
          update: { $set: { content: content.content } }
        }
      })),
      ...removedContentData.map(({ contentPieceId }) => ({
        deleteOne: {
          filter: { contentPieceId }
        }
      }))
    ];
    const contentGroupsChanges: AnyBulkWriteOperation<UnderscoreID<FullContentGroup<ObjectId>>>[] =
      [
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
          lastCommitDate: lastCommit.date,
          lastCommitId: lastCommit.id
        }
      }
    );
  };

  return {
    applyPull,
    conflicts
  };
};
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const gitDataCollection = getGitDataCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });
  const gitProvider = useGitProvider(ctx, gitData);

  if (!gitData || !gitProvider) throw errors.serverError();

  const { lastCommit, changedRecordsByDirectory } = await gitProvider.pull();
  const { transformer } = gitProvider.data;
  const { applyPull, conflicts } = await processPulledRecords({
    changedRecordsByDirectory,
    gitProvider,
    lastCommit,
    gitData,
    ctx,
    transformer
  });

  if (conflicts.length && !input.force) {
    const outputContentProcessor = await createOutputContentProcessor(ctx, transformer);
    const contentPieces = await contentPiecesCollection
      .find({
        _id: {
          $in: conflicts.map((conflict) => conflict.contentPieceId)
        }
      })
      .toArray();
    const contents = await contentsCollection
      .find({
        contentPieceId: {
          $in: conflicts.map((conflict) => conflict.contentPieceId)
        }
      })
      .toArray();
    const currentContents = await outputContentProcessor.processBatch(
      conflicts
        .map((conflict) => {
          const baseContentPiece = contentPieces.find(
            (contentPiece) => `${contentPiece._id}` === `${conflict.contentPieceId}`
          );
          const contentPiece = baseContentPiece;

          let contentBuffer: Uint8Array | null = null;

          contentBuffer =
            (
              contents.find(
                (content) => `${content.contentPieceId}` === `${conflict.contentPieceId}`
              ) || {}
            ).content?.buffer || null;

          if (!contentPiece || !contentBuffer) return null;

          return {
            buffer: Buffer.from(contentBuffer),
            contentPiece
          };
        })
        .filter(Boolean) as OutputContentProcessorInput[]
    );

    return {
      status: "conflict",
      conflicted: await Promise.all(
        conflicts
          .map(async (conflict, index) => {
            return {
              path: conflict.path,
              contentPieceId: `${conflict.contentPieceId}`,
              currentContent: currentContents[index],
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
};

export { inputSchema, outputSchema, handler };
