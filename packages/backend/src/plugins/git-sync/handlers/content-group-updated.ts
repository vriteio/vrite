import { processContentGroupMoved } from "./content-group-moved";
import { createGitSyncHandler } from "../utils";
import { ObjectId } from "mongodb";
import { FullContentGroup } from "#collections";
import { UnderscoreID } from "#lib/mongo";

const handleContentGroupUpdated = createGitSyncHandler<{
  contentGroup: UnderscoreID<FullContentGroup<ObjectId>>;
  name?: string;
  ancestor?: string;
}>(async ({ ctx, gitData, directories, records, outputContentProcessor }, data) => {
  if (!data.name && !data.ancestor) return { directories, records };

  if (!data.name) {
    return processContentGroupMoved(
      { ctx, gitData, directories, records, outputContentProcessor },
      data
    );
  }

  let newDirectories = [...directories];
  let newRecords = [...records];

  const existingDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.contentGroup._id);
  });

  if (existingDirectory) {
    const directoryPath = existingDirectory.path;

    if (directoryPath === "") return { directories, records };

    newDirectories = newDirectories.map((directory) => {
      if (directory.path.startsWith(directoryPath)) {
        return {
          ...directory,
          path: directory.path.replace(
            directoryPath,
            [...directoryPath.split("/").slice(0, -1), data.name].join("/")
          )
        };
      }

      return directory;
    });
    newRecords = records.flatMap((record) => {
      if (record.path.startsWith(directoryPath)) {
        return [
          {
            ...record,
            currentHash: ""
          },
          {
            ...record,
            path: record.path.replace(
              directoryPath,
              [...directoryPath.split("/").slice(0, -1), data.name].join("/")
            ),
            syncedHash: ""
          }
        ];
      }

      return [record];
    });

    return { directories: newDirectories, records: newRecords };
  }

  return { directories: newDirectories, records: newRecords };
});

export { handleContentGroupUpdated };
