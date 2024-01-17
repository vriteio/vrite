import { createGitSyncHandler } from "../utils";
import { ObjectId } from "mongodb";
import { FullContentPiece } from "#collections";
import { UnderscoreID } from "#lib/mongo";

const handleContentPieceMoved = createGitSyncHandler<{
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
  contentGroupId?: string;
}>(async ({ directories, records, gitData }, data) => {
  let newRecords = [...records];
  // TODO: Extract
  let { variantsDirectory, baseVariantDirectory } = gitData.github!;

  if (variantsDirectory.startsWith("/")) variantsDirectory = variantsDirectory.slice(1);
  if (baseVariantDirectory.startsWith("/")) baseVariantDirectory = baseVariantDirectory.slice(1);

  const variantsPathRegex = new RegExp(`^${variantsDirectory}/(.+?)(?=/|$)`);

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
            .join("/")
            .replace(
              variantsPathRegex,
              `${variantsDirectory}/${data.variantKey || baseVariantDirectory}`
                .split("/")
                .filter(Boolean)
                .join("/")
            )}`,
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
