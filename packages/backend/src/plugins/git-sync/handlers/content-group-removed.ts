import { createGitSyncHandler } from "../utils";
import { ObjectId } from "mongodb";
import { FullContentGroup } from "#collections";
import { UnderscoreID } from "#lib/mongo";

const handleContentGroupRemoved = createGitSyncHandler<{
  contentGroup: UnderscoreID<FullContentGroup<ObjectId>>;
}>(async ({ directories, records }, data) => {
  const existingDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.contentGroup._id);
  });

  if (!existingDirectory) return { directories, records };

  const directoryPath = existingDirectory.path;

  return {
    directories: directories.filter((directory) => {
      return !directory.path.startsWith(directoryPath);
    }),
    records: records.map((record) => {
      if (record.path.startsWith(directoryPath)) {
        return {
          ...record,
          currentHash: ""
        };
      }

      return record;
    })
  };
});

export { handleContentGroupRemoved };
