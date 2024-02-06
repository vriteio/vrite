import { createGitSyncHandler } from "../utils";
import { ObjectId } from "mongodb";
import { FullContentGroup } from "#collections";
import { UnderscoreID } from "#lib/mongo";

const handleContentGroupCreated = createGitSyncHandler<{
  contentGroup: UnderscoreID<FullContentGroup<ObjectId>>;
}>(async ({ directories, records }, data) => {
  const newDirectories = [...directories];
  const directAncestor = data.contentGroup.ancestors[data.contentGroup.ancestors.length - 1];

  if (directAncestor) {
    const ancestorDirectory = newDirectories.find((directory) => {
      return directory.contentGroupId.equals(directAncestor);
    });

    if (ancestorDirectory) {
      newDirectories.push({
        contentGroupId: data.contentGroup._id,
        path: ancestorDirectory.path
          .split("/")
          .concat(data.contentGroup.name || `${data.contentGroup._id}`)
          .filter(Boolean)
          .join("/")
      });
    }
  }

  return { directories: newDirectories, records };
});

export { handleContentGroupCreated };
