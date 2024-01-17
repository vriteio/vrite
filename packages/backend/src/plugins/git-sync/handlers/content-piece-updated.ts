import { createGitSyncHandler } from "../utils";
import { Binary, ObjectId } from "mongodb";
import crypto from "node:crypto";
import {
  FullContentPiece,
  getContentVariantsCollection,
  getContentsCollection
} from "#collections";
import { UnderscoreID } from "#lib/mongo";

const handleContentPieceUpdated = createGitSyncHandler<{
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
  variantId?: ObjectId | null;
  variantKey?: string | null;
}>(async ({ ctx, directories, records, outputContentProcessor, gitData }, data) => {
  let newRecords = [...records];
  // TODO: Extract
  let { variantsDirectory, baseVariantDirectory } = gitData.github!;

  if (variantsDirectory.startsWith("/")) variantsDirectory = variantsDirectory.slice(1);
  if (baseVariantDirectory.startsWith("/")) baseVariantDirectory = baseVariantDirectory.slice(1);

  const variantsPathRegex = new RegExp(`^${variantsDirectory}/(.+?)(?=/|$)`);
  const contentsCollection = getContentsCollection(ctx.db);
  const contentVariantsCollection = getContentVariantsCollection(ctx.db);
  const existingRecord = records.find((record) => {
    return (
      record.contentPieceId.equals(data.contentPiece._id) &&
      (!data.variantId || record.variantId?.equals(data.variantId)) &&
      record.currentHash
    );
  });
  const existingDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.contentPiece.contentGroupId);
  });

  // Content piece outside of Git-synced content group
  if (!existingRecord || !existingDirectory) return { directories, records };

  let content: Binary | null = null;

  if (data.variantId) {
    content =
      (
        (await contentVariantsCollection.findOne({
          contentPieceId: data.contentPiece._id,
          variantId: data.variantId
        })) || {}
      )?.content || null;
  } else {
    content =
      (
        (await contentsCollection.findOne({
          contentPieceId: data.contentPiece._id
        })) || {}
      )?.content || null;
  }

  if (!content) return { directories, records: newRecords };

  const output = await outputContentProcessor.process({
    buffer: Buffer.from(content.buffer),
    contentPiece: data.contentPiece
  });
  const contentHash = crypto.createHash("md5").update(output).digest("hex");
  const newRecordPath = existingDirectory.path
    .split("/")
    .concat(data.contentPiece.filename || `${data.contentPiece._id}`)
    .filter(Boolean)
    .join("/")
    .replace(
      variantsPathRegex,
      `${variantsDirectory}/${data.variantKey || baseVariantDirectory}`
        .split("/")
        .filter(Boolean)
        .join("/")
    );

  newRecords = records.flatMap((record) => {
    if (record === existingRecord) {
      if (existingRecord.path !== newRecordPath) {
        return [
          {
            ...record,
            currentHash: ""
          },
          {
            ...record,
            path: newRecordPath,
            currentHash: contentHash,
            syncedHash: ""
          }
        ];
      }

      return [
        {
          ...record,
          currentHash: contentHash
        }
      ];
    }

    return [record];
  });

  return { directories, records: newRecords };
});

export { handleContentPieceUpdated };
