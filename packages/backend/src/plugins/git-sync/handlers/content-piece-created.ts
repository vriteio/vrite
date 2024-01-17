import { createGitSyncHandler } from "../utils";
import { ObjectId } from "mongodb";
import crypto from "node:crypto";
import { FullContentPiece } from "#collections";
import { UnderscoreID } from "#lib/mongo";
import { jsonToBuffer } from "#lib/content-processing";

const handleContentPieceCreated = createGitSyncHandler<{
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
  contentBuffer?: Buffer | null;
}>(async ({ directories, records, outputContentProcessor }, data) => {
  const existingDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.contentPiece.contentGroupId);
  });

  if (!existingDirectory) return { directories, records };

  const output = await outputContentProcessor.process({
    buffer: data.contentBuffer || jsonToBuffer({ type: "doc", content: [] }),
    contentPiece: data.contentPiece
  });
  const contentHash = crypto.createHash("md5").update(output).digest("hex");

  return {
    directories,
    records: [
      ...records,
      {
        contentPieceId: data.contentPiece._id,
        path: existingDirectory.path
          .split("/")
          .concat(data.contentPiece.filename || `${data.contentPiece._id}`)
          .filter(Boolean)
          .join("/"),
        currentHash: contentHash,
        syncedHash: ""
      }
    ]
  };
});

export { handleContentPieceCreated };
