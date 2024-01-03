import { createGitSyncHandler } from "../utils";
import { ObjectId } from "mongodb";
import { FullContentPiece } from "#collections";
import { UnderscoreID } from "#lib/mongo";

const handleContentPieceRemoved = createGitSyncHandler<{
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
}>(async ({ directories, records }, data) => {
  return {
    directories,
    records: records.map((record) => {
      if (record.contentPieceId.equals(data.contentPiece._id)) {
        return {
          ...record,
          currentHash: ""
        };
      }

      return record;
    })
  };
});

export { handleContentPieceRemoved };
