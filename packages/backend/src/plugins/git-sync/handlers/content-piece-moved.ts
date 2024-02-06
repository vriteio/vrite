import { createGitSyncHandler } from "../utils";
import { ObjectId } from "mongodb";
import { FullContentPiece } from "#collections";
import { UnderscoreID } from "#lib/mongo";

const handleContentPieceMoved = createGitSyncHandler<{
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
  contentGroupId?: string;
}>(async ({ directories, records, gitData }, data) => {
  let newRecords = [...records];

  if (!data.contentGroupId) return { directories, records };

  const existingDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.contentGroupId!);
  });

  if (!existingDirectory) return { directories, records };

  newRecords = newRecords.flatMap((record) => {
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
  });

  return {
    directories,
    records: newRecords
  };
});

export { handleContentPieceMoved };
