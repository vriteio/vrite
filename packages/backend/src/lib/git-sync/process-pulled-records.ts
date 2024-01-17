import { ProcessInputResult, createInputContentProcessor } from "./process-content";
import { GitSyncCommit } from "./integration";
import { LexoRank } from "lexorank";
import { ObjectId, Binary, AnyBulkWriteOperation } from "mongodb";
import { convert as convertToSlug } from "url-slug";
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
  GitDirectory,
  FullContentVariant,
  FullContentPieceVariant,
  FullVariant,
  getVariantsCollection,
  getContentPieceVariantsCollection,
  getContentVariantsCollection
} from "#collections";
import { errors } from "#lib/errors";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID } from "#lib/mongo";

interface PulledRecords {
  changedRecordsByDirectory: Map<
    string,
    Array<{ fileName: string; status: string; content?: string; hash: string }>
  >;
  lastCommit: GitSyncCommit;
}

const retrieveVariants = async (
  ctx: AuthenticatedContext,
  variantKeys: string[]
): Promise<{
  variants: Map<string, UnderscoreID<FullVariant<ObjectId>>>;
  newVariants: Map<string, UnderscoreID<FullVariant<ObjectId>>>;
}> => {
  const variantsCollection = getVariantsCollection(ctx.db);
  const newVariants = new Map<string, UnderscoreID<FullVariant<ObjectId>>>();
  const variants = new Map<string, UnderscoreID<FullVariant<ObjectId>>>();
  const variantsCursor = variantsCollection.find({
    key: { $in: variantKeys.map((variantKey) => variantKey.toLowerCase()) },
    workspaceId: ctx.auth.workspaceId
  });

  for await (const variant of variantsCursor) {
    variants.set(variant.key, variant);
  }

  for (const variantKey of variantKeys) {
    if (!variants.has(variantKey)) {
      const newVariant: UnderscoreID<FullVariant<ObjectId>> = {
        _id: new ObjectId(),
        key: variantKey.toLowerCase(),
        label: variantKey,
        workspaceId: ctx.auth.workspaceId
      };

      newVariants.set(variantKey.toLowerCase(), newVariant);
      variants.set(variantKey.toLowerCase(), newVariant);
    }
  }

  return { variants, newVariants };
};
const processPulledRecords = async ({
  changedRecordsByDirectory,
  lastCommit,
  gitData,
  ctx,
  transformer
}: PulledRecords & {
  gitData: UnderscoreID<FullGitData<ObjectId>>;
  ctx: AuthenticatedContext;
  transformer: string;
}): Promise<{
  applyPull: () => Promise<void>;
  conflicts: Array<{
    path: string;
    contentPieceId: ObjectId;
    variantId?: ObjectId;
    pulledContent: string;
    pulledHash: string;
  }>;
}> => {
  const variantsCollection = getVariantsCollection(ctx.db);
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentPieceVariantsCollection = getContentPieceVariantsCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);
  const contentVariantsCollection = getContentVariantsCollection(ctx.db);
  const gitDataCollection = getGitDataCollection(ctx.db);
  const newContentGroups: UnderscoreID<FullContentGroup<ObjectId>>[] = [];
  const updatedContentGroups: Pick<
    UnderscoreID<FullContentGroup<ObjectId>>,
    "_id" | "descendants"
  >[] = [];
  const newContentPieces: UnderscoreID<FullContentPiece<ObjectId>>[] = [];
  const newContents: UnderscoreID<FullContents<ObjectId>>[] = [];
  const newContentPieceVariants: UnderscoreID<FullContentPieceVariant<ObjectId>>[] = [];
  const newContentVariants: UnderscoreID<FullContentVariant<ObjectId>>[] = [];
  const updatedContentPieces: Array<
    { _id: ObjectId } & Partial<Partial<UnderscoreID<FullContentPiece<ObjectId>>>>
  > = [];
  const updatedContentPieceVariants: Array<
    { contentPieceId: ObjectId; variantId: ObjectId } & Partial<
      Partial<UnderscoreID<FullContentPieceVariant<ObjectId>>>
    >
  > = [];
  const updatedContents: Array<
    { contentPieceId: ObjectId } & Partial<Partial<UnderscoreID<FullContents<ObjectId>>>>
  > = [];
  const updatedContentVariants: Array<
    { contentPieceId: ObjectId; variantId: ObjectId } & Partial<
      Partial<UnderscoreID<FullContentVariant<ObjectId>>>
    >
  > = [];
  const removedContentData: Array<{ contentPieceId: ObjectId; variantId?: ObjectId }> = [];
  const newRecords: Array<GitRecord<ObjectId>> = [...gitData.records];
  const newDirectories: Array<GitDirectory<ObjectId>> = [...gitData.directories];
  const conflicts: Array<{
    path: string;
    contentPieceId: ObjectId;
    variantId?: ObjectId;
    pulledContent: string;
    pulledHash: string;
  }> = [];
  const inputContentProcessor = await createInputContentProcessor(ctx, transformer);

  // TODO: Remove GitHub specific code
  let { baseDirectory, variantsDirectory, baseVariantDirectory } = gitData.github!;

  if (baseDirectory.startsWith("/")) baseDirectory = baseDirectory.slice(1);
  if (variantsDirectory.startsWith("/")) variantsDirectory = variantsDirectory.slice(1);
  if (baseVariantDirectory.startsWith("/")) baseVariantDirectory = baseVariantDirectory.slice(1);

  const variantsPathRegex = new RegExp(`^${variantsDirectory}/(.+?)(?=/|$)`);
  const createDirectory = async (
    path: string
  ): Promise<UnderscoreID<FullContentGroup<ObjectId>>> => {
    const isVariantDirectory = path.startsWith(variantsDirectory);

    let processedPath = path;

    if (isVariantDirectory) {
      const pathWithoutVariantsDirectory = path.slice(variantsDirectory.length + 1);
      const pathWithoutVariantDirectory = pathWithoutVariantsDirectory.slice(
        pathWithoutVariantsDirectory.indexOf("/") + 1
      );

      if (pathWithoutVariantDirectory) {
        processedPath = `${variantsDirectory}/[variant]/${pathWithoutVariantDirectory}`;
      }
    }

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
    const processedDirectoryPath = directoryPath.replace(
      variantsPathRegex,
      `${variantsDirectory}/[variant]`
    );

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
          return record.path === `${directoryPath}/${changedRecord.fileName}`;
        });

        if (!existingRecord) continue;

        if (
          existingRecord.currentHash !== existingRecord.syncedHash &&
          existingRecord.syncedHash !== changedRecord.hash
        ) {
          conflicts.push({
            path: existingRecord.path,
            contentPieceId: existingRecord.contentPieceId,
            variantId: existingRecord.variantId,
            pulledContent: changedRecord.content || "",
            pulledHash: changedRecord.hash
          });
        }

        if (existingRecord.currentHash !== existingRecord.syncedHash) continue;

        if (existingRecord.variantId) {
          newRecords.splice(newRecords.indexOf(existingRecord), 1);
          removedContentData.push({
            contentPieceId: existingRecord.contentPieceId,
            variantId: existingRecord.variantId
          });
        } else if (existingRecord.path.startsWith(`${variantsDirectory}/${baseVariantDirectory}`)) {
          // Base variant - remove all variants and base variant
          const variantRecords = newRecords.filter((record) => {
            return `${record.contentPieceId}` === `${existingRecord.contentPieceId}`;
          });

          variantRecords.forEach((record) => {
            newRecords.splice(newRecords.indexOf(existingRecord), 1);
            removedContentData.push({
              contentPieceId: existingRecord.contentPieceId,
              variantId: record.variantId
            });
          });
        } else {
          newRecords.splice(newRecords.indexOf(existingRecord), 1);
          removedContentData.push({ contentPieceId: existingRecord.contentPieceId });
        }

        continue;
      }

      const existingRecord = newRecords.find((record) => {
        return (
          record.path === `${directoryPath}${directoryPath ? "/" : ""}${changedRecord.fileName}`
        );
      });
      const { contentGroupId } =
        newDirectories.find((directory) => {
          return (
            directory.path ===
            directoryPath.replace(variantsPathRegex, `${variantsDirectory}/[variant]`)
          );
        }) || {};

      if (!contentGroupId) continue;

      // TODO: Remove console.log("EXISTING RECORD", existingRecord, directoryPath, changedRecord);

      // Update existing record
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
            variantId: existingRecord.variantId,
            pulledContent: changedRecord.content || "",
            pulledHash: changedRecord.hash
          });
        }

        if (existingRecord.currentHash === existingRecord.syncedHash) {
          if (existingRecord.variantId) {
            updatedContentPieceVariants.push({
              contentPieceId: existingRecord.contentPieceId,
              variantId: existingRecord.variantId,
              ...restMetadata,
              ...(date && { date: new Date(date) }),
              ...(members && { members: members.map((memberId) => new ObjectId(memberId)) }),
              ...(tags && { tags: tags.map((tagId) => new ObjectId(tagId)) })
            });
            updatedContentVariants.push({
              contentPieceId: existingRecord.contentPieceId,
              variantId: existingRecord.variantId,
              content: new Binary(buffer)
            });
          } else {
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
          }

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
        path: `${directoryPath}/${changedRecord.fileName}`,
        workspaceId: ctx.auth.workspaceId,
        contentGroupId,
        order
      });
    }
  }

  const { variants, newVariants } = await retrieveVariants(ctx, [
    ...new Set(
      createSyncedPiecesSources
        .map(({ path }) => variantsPathRegex.exec(path)?.[1] || "")
        .filter(Boolean)
    )
  ]);
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
  const contentPieceVariantsToProcess: Array<{
    path: string;
    content: string;
    workspaceId: ObjectId;
    contentGroupId: ObjectId;
    order: string;
    buffer: Buffer;
    hash: string;
    metadata: ProcessInputResult["metadata"];
    variantId: ObjectId;
  }> = [];

  // Split variants and base
  createSyncedPiecesSources.forEach((createSyncedPiecesSource, index) => {
    const variantPathMatch = variantsPathRegex.exec(createSyncedPiecesSource.path);
    const isBaseVariant =
      variantPathMatch &&
      createSyncedPiecesSource.path.startsWith(`${variantsDirectory}/${baseVariantDirectory}`);
    const processedContent = processedContents[index];

    if (!variantPathMatch || isBaseVariant) {
      contentPiecesToProcess.push({
        ...createSyncedPiecesSource,
        ...processedContent
      });
    } else {
      const variantId = variants.get(variantPathMatch[1] || "")?._id;

      if (!variantId) return;

      contentPieceVariantsToProcess.push({
        ...createSyncedPiecesSource,
        ...processedContent,
        variantId
      });
    }
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
  contentPieceVariantsToProcess.forEach((contentPieceToProcess) => {
    const { members, tags, date, ...inputMetadata } = contentPieceToProcess.metadata;
    const filename = contentPieceToProcess.path.split("/").pop() || "";
    const baseVariantPath = contentPieceToProcess.path.replace(
      variantsPathRegex,
      `${variantsDirectory}/${baseVariantDirectory}`
    );
    const baseVariantRecord = newRecords.find((record) => record.path === baseVariantPath);
    const contentPieceId = baseVariantRecord?.contentPieceId;

    if (!contentPieceId) return;

    newContentPieceVariants.push({
      _id: new ObjectId(),
      contentPieceId,
      variantId: contentPieceToProcess.variantId,
      workspaceId: ctx.auth.workspaceId,
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
    newContentVariants.push({
      _id: new ObjectId(),
      contentPieceId,
      variantId: contentPieceToProcess.variantId,
      content: new Binary(contentPieceToProcess.buffer)
    });
    newRecords.push({
      contentPieceId,
      variantId: contentPieceToProcess.variantId,
      currentHash: contentPieceToProcess.hash,
      syncedHash: contentPieceToProcess.hash,
      path: contentPieceToProcess.path
    });
  });

  if (newVariants.size) {
    await variantsCollection.bulkWrite(
      [...newVariants.values()].map((variant) => ({
        insertOne: { document: variant }
      }))
    );
  }

  /* TODO: Remove
  console.log("RECORDS", newDirectories, newRecords);
  console.log("GROUPS", newContentGroups, updatedContentGroups);
  console.log("PIECES", newContentPieces, updatedContentPieces);
  console.log("PIECE VARIANTS", newContentPieceVariants, updatedContentPieceVariants);
  console.log("VARIANTS", newVariants);
  console.log("REMOVED DATA", removedContentData);
  console.log("CONFLICTS", conflicts);*/

  const applyPull = async (): Promise<void> => {
    const removeContentDataVariantsChanges = removedContentData
      .filter(({ variantId }) => variantId)
      .map(({ contentPieceId, variantId }) => ({
        deleteOne: {
          filter: { contentPieceId, variantId }
        }
      }));
    const contentPieceVariantsChanges: AnyBulkWriteOperation<
      UnderscoreID<FullContentPieceVariant<ObjectId>>
    >[] = [
      ...newContentPieceVariants.map((contentPieceVariant) => ({
        insertOne: { document: contentPieceVariant }
      })),
      ...updatedContentPieceVariants.map(
        ({ contentPieceId, variantId, ...contentPieceVariant }) => ({
          updateOne: {
            filter: { contentPieceId, variantId },
            update: { $set: contentPieceVariant }
          }
        })
      ),
      ...removeContentDataVariantsChanges
    ];
    const contentVariantsChanges: AnyBulkWriteOperation<
      UnderscoreID<FullContentVariant<ObjectId>>
    >[] = [
      ...newContentVariants.map((contentVariant) => ({ insertOne: { document: contentVariant } })),
      ...updatedContentVariants.map(({ contentPieceId, variantId, ...contentVariant }) => ({
        updateOne: {
          filter: { contentPieceId, variantId },
          update: { $set: contentVariant }
        }
      })),
      ...removeContentDataVariantsChanges
    ];
    const contentPiecesChanges: AnyBulkWriteOperation<UnderscoreID<FullContentPiece<ObjectId>>>[] =
      [
        ...newContentPieces.map((contentPiece) => ({ insertOne: { document: contentPiece } })),
        ...updatedContentPieces.map(({ _id, ...contentPieceMetadata }) => ({
          updateOne: {
            filter: { _id },
            update: { $set: contentPieceMetadata }
          }
        })),
        ...removedContentData
          .filter(({ variantId }) => !variantId)
          .map(({ contentPieceId }) => ({
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
      ...removedContentData
        .filter(({ variantId }) => !variantId)
        .map(({ contentPieceId }) => ({
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

    if (contentPieceVariantsChanges.length) {
      await contentPieceVariantsCollection.bulkWrite(contentPieceVariantsChanges);
    }

    if (contentVariantsChanges.length) {
      await contentVariantsCollection.bulkWrite(contentVariantsChanges);
    }

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

export { processPulledRecords };
