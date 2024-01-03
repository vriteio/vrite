import { createGitSyncHandler } from "../utils";
import { ObjectId } from "mongodb";
import crypto from "node:crypto";
import { FullContentPiece, getContentsCollection } from "#collections";
import { UnderscoreID } from "#lib/mongo";

const handleContentPieceUpdated = createGitSyncHandler<{
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
}>(async ({ ctx, directories, records, outputContentProcessor }, data) => {
  let newRecords = [...records];

  const contentsCollection = getContentsCollection(ctx.db);
  const existingRecord = records.find((record) => {
    return record.contentPieceId.equals(data.contentPiece._id) && record.currentHash;
  });
  const existingDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.contentPiece.contentGroupId);
  });

  if (!existingRecord || !existingDirectory) return { directories, records };

  const { content } =
    (await contentsCollection.findOne({
      contentPieceId: data.contentPiece._id
    })) || {};

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
    .join("/");

  newRecords = records.flatMap((record) => {
    if (record.contentPieceId.equals(data.contentPiece._id) && record.currentHash) {
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
