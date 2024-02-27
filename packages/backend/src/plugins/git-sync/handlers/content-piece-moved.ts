import { createGitSyncHandler } from "../utils";
import { ObjectId } from "mongodb";
import crypto from "node:crypto";
import { FullContentPiece, getContentsCollection } from "#collections";
import { UnderscoreID } from "#lib/mongo";
import { jsonToBuffer } from "#lib/content-processing";

const handleContentPieceMoved = createGitSyncHandler<{
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
  contentGroupId?: string;
}>(async ({ directories, records, outputContentProcessor, ctx }, data) => {
  const contentsCollection = getContentsCollection(ctx.db);
  const newRecords = [...records];

  if (!data.contentGroupId) return { directories, records };

  const existingDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.contentGroupId!);
  });
  const existingRecord = records.find((record) => {
    return record.contentPieceId.equals(data.contentPiece._id);
  });

  if (!existingDirectory && !existingRecord) {
    // Any changes to the piece were done outside Git synced group
    return { directories, records };
  }

  if (!existingDirectory && existingRecord) {
    // The piece was moved outside Git synced group
    return {
      directories,
      records: newRecords.map((record) => {
        if (record.contentPieceId.equals(data.contentPiece._id)) {
          return {
            ...record,
            currentHash: ""
          };
        }

        return record;
      })
    };
  }

  if (existingDirectory && !existingRecord) {
    // The piece was moved into Git synced group
    const content =
      (
        (await contentsCollection.findOne({
          contentPieceId: data.contentPiece._id
        })) || {}
      )?.content || null;

    if (!content) return { directories, records: newRecords };

    const output = await outputContentProcessor.process({
      buffer: Buffer.from(content.buffer) || jsonToBuffer({ type: "doc", content: [] }),
      contentPiece: data.contentPiece
    });
    const contentHash = crypto.createHash("md5").update(output).digest("hex");

    return {
      directories,
      records: [
        ...newRecords,
        {
          path: `${existingDirectory.path
            .split("/")
            .concat(data.contentPiece.filename || `${data.contentPiece._id}`)
            .filter(Boolean)
            .join("/")}`,
          contentPieceId: data.contentPiece._id,
          currentHash: contentHash,
          syncedHash: ""
        }
      ]
    };
  }

  if (existingDirectory && existingRecord) {
    // The piece was moved within Git synced group
    return {
      directories,
      records: newRecords.flatMap((record) => {
        if (record.contentPieceId.equals(data.contentPiece._id)) {
          return [
            {
              ...record,
              currentHash: ""
            },
            {
              ...record,
              path: `${existingDirectory.path
                .split("/")
                .concat(data.contentPiece.filename || `${data.contentPiece._id}`)
                .filter(Boolean)
                .join("/")}`,
              syncedHash: ""
            }
          ];
        }

        return [record];
      })
    };
  }

  return { directories, records };
});

export { handleContentPieceMoved };
