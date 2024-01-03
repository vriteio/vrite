import { createGitSyncHandler } from "../utils";
import { ObjectId } from "mongodb";
import crypto from "node:crypto";
import { FullContentPiece, getContentsCollection } from "#collections";
import { UnderscoreID } from "#lib/mongo";

const handleContentPieceMoved = createGitSyncHandler<{
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
  contentGroupId?: string;
}>(async ({ ctx, directories, records, outputContentProcessor }, data) => {
  const contentsCollection = getContentsCollection(ctx.db);

  let newRecords = [...records];

  if (!data.contentGroupId) return { directories, records };

  newRecords = newRecords.map((record) => {
    if (record.contentPieceId.equals(data.contentPiece._id)) {
      return {
        ...record,
        currentHash: ""
      };
    }

    return record;
  });

  const existingDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.contentGroupId!);
  });

  if (!existingDirectory) return { directories, records: newRecords };

  const { content } =
    (await contentsCollection.findOne({
      contentPieceId: data.contentPiece._id
    })) || {};

  if (!content) return { directories, records: newRecords };

  const output = await outputContentProcessor.process({
    buffer: Buffer.from(content.buffer),
    contentPiece: data.contentPiece
  });

  newRecords.push({
    contentPieceId: data.contentPiece._id,
    path: `${existingDirectory.path
      .split("/")
      .concat(data.contentPiece.filename || `${data.contentPiece._id}`)
      .filter(Boolean)
      .join("/")}`,
    currentHash: crypto.createHash("md5").update(output).digest("hex"),
    syncedHash: ""
  });

  return {
    directories,
    records: newRecords
  };
});

export { handleContentPieceMoved };
