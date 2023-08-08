/* eslint-disable sonarjs/no-identical-functions */
import { AuthenticatedContext } from "./middleware";
import { ObjectId, UnderscoreID } from "./mongo";
import { jsonToBuffer } from "./processing";
import crypto from "node:crypto";
import {
  FullContentGroup,
  FullContentPiece,
  FullGitData,
  GitDirectory,
  GitRecord,
  getContentGroupsCollection,
  getContentPiecesCollection,
  getContentsCollection,
  getGitDataCollection
} from "#database";
import { processOutputContent as processOutputContentGitHub } from "#routes/git/github/process-content";

type GitSyncHookEvent =
  | "contentPieceUpdated"
  | "contentPieceRemoved"
  | "contentPieceCreated"
  | "contentPieceMoved"
  | "contentGroupUpdated"
  | "contentGroupMoved"
  | "contentGroupRemoved"
  | "contentGroupCreated";
type GitSyncHookEventData = {
  contentPieceUpdated: {
    contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
  };
  contentPieceRemoved: {
    contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
  };
  contentPieceCreated: {
    contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
    contentBuffer?: Buffer | null;
  };
  contentPieceMoved: {
    contentPiece: UnderscoreID<FullContentPiece<ObjectId>>;
    contentGroupId?: string;
  };
  contentGroupUpdated: {
    contentGroup: UnderscoreID<FullContentGroup<ObjectId>>;
    name?: string;
    ancestor?: string;
  };
  contentGroupMoved: {
    contentGroup: UnderscoreID<FullContentGroup<ObjectId>>;
    ancestor?: string | null;
  };
  contentGroupRemoved: {
    contentGroup: UnderscoreID<FullContentGroup<ObjectId>>;
  };
  contentGroupCreated: {
    contentGroup: UnderscoreID<FullContentGroup<ObjectId>>;
  };
};
type GitSyncHookData = {
  directories: GitDirectory<ObjectId>[];
  records: GitRecord<ObjectId>[];
};
type GitSyncHookPostProcessor = (input: GitSyncHookData) => GitSyncHookData;
type GitSyncHookHandler<E extends GitSyncHookEvent> = (
  input: GitSyncHookData & {
    ctx: AuthenticatedContext;
    gitData: UnderscoreID<FullGitData<ObjectId>>;
  },
  data: GitSyncHookEventData[E]
) => Promise<GitSyncHookData>;

const processOutputContent = (
  buffer: Buffer,
  contentPiece: UnderscoreID<FullContentPiece<ObjectId>>,
  gitData: UnderscoreID<FullGitData<ObjectId>>
): string => {
  if (gitData.provider === "github") {
    return processOutputContentGitHub(buffer, contentPiece, gitData.github!);
  }

  return "";
};
const handleContentGroupMoved: GitSyncHookHandler<"contentGroupMoved"> = async (
  { ctx, gitData, directories, records },
  data
) => {
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const contentPiecesCollection = getContentPiecesCollection(ctx.db);
  const contentsCollection = getContentsCollection(ctx.db);

  let newDirectories = [...directories];
  let newRecords = [...records];

  const existingDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.contentGroup._id);
  });

  if (existingDirectory) {
    newDirectories = newDirectories.filter((directory) => {
      return !directory.path.startsWith(existingDirectory.path);
    });
    newRecords = newRecords.map((record) => {
      if (record.path.startsWith(existingDirectory.path)) {
        return {
          ...record,
          currentHash: ""
        };
      }

      return record;
    });
  }

  if (!data.ancestor) return { directories: newDirectories, records: newRecords };

  const ancestorDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.ancestor!);
  });

  if (!ancestorDirectory) return { directories: newDirectories, records: newRecords };

  const nestedContentGroups = await contentGroupsCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      $or: [
        {
          ancestors: data.contentGroup._id
        },
        {
          _id: data.contentGroup._id
        }
      ]
    })
    .toArray();
  const contentPieces = await contentPiecesCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      contentGroupId: { $in: nestedContentGroups.map((contentGroup) => contentGroup._id) }
    })
    .toArray();
  const contents = await contentsCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      contentPieceId: { $in: contentPieces.map((contentPiece) => contentPiece._id) }
    })
    .toArray();

  nestedContentGroups
    .sort((contentGroupA, contentGroupB) => {
      // sort ascending by ancestors length
      if (contentGroupA.ancestors.length < contentGroupB.ancestors.length) return -1;
      if (contentGroupA.ancestors.length > contentGroupB.ancestors.length) return 1;

      return 0;
    })
    .forEach((contentGroup) => {
      const ancestorDirectory = newDirectories.find((directory) => {
        return directory.contentGroupId.equals(contentGroup.ancestors.at(-1)!);
      });

      if (!ancestorDirectory) return;

      newDirectories.push({
        contentGroupId: contentGroup._id,
        path: ancestorDirectory.path
          .split("/")
          .concat(contentGroup.name || `${contentGroup._id}`)
          .filter(Boolean)
          .join("/")
      });
      contentPieces.forEach((contentPiece) => {
        if (!contentPiece.contentGroupId.equals(contentGroup._id)) return;

        const { content } =
          contents.find((content) => {
            return content.contentPieceId.equals(contentPiece._id);
          }) || {};

        if (!content) return;

        const output = processOutputContent(Buffer.from(content.buffer), contentPiece, gitData);
        const hash = crypto.createHash("md5").update(output).digest("hex");

        newRecords.push({
          contentPieceId: contentPiece._id,
          path: ancestorDirectory.path
            .split("/")
            .concat(
              contentGroup.name || `${contentGroup._id}`,
              contentPiece.filename || `${contentPiece._id}`
            )
            .filter(Boolean)
            .join("/"),
          currentHash: hash,
          syncedHash: ""
        });
      });
    });

  return { directories: newDirectories, records: newRecords };
};
const handleContentGroupUpdated: GitSyncHookHandler<"contentGroupUpdated"> = async (
  { ctx, gitData, directories, records },
  data
) => {
  if (!data.name && !data.ancestor) return { directories, records };
  if (!data.name) return handleContentGroupMoved({ ctx, gitData, directories, records }, data);

  let newDirectories = [...directories];
  let newRecords = [...records];

  const existingDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.contentGroup._id);
  });

  if (existingDirectory) {
    const directoryPath = existingDirectory.path;

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
};
const handleContentGroupCreated: GitSyncHookHandler<"contentGroupCreated"> = async (
  { directories, records },
  data
) => {
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
};
const handleContentGroupRemoved: GitSyncHookHandler<"contentGroupRemoved"> = async (
  { directories, records },
  data
) => {
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
};
const handleContentPieceMoved: GitSyncHookHandler<"contentPieceMoved"> = async (
  { ctx, gitData, directories, records },
  data
) => {
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
      workspaceId: ctx.auth.workspaceId,
      contentPieceId: data.contentPiece._id
    })) || {};

  if (!content) return { directories, records: newRecords };

  const output = processOutputContent(Buffer.from(content.buffer), data.contentPiece, gitData);

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
};
const handleContentPieceUpdated: GitSyncHookHandler<"contentPieceUpdated"> = async (
  { ctx, gitData, directories, records },
  data
) => {
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
      workspaceId: ctx.auth.workspaceId,
      contentPieceId: data.contentPiece._id
    })) || {};

  if (!content) return { directories, records: newRecords };

  const output = processOutputContent(Buffer.from(content.buffer), data.contentPiece, gitData);
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
};
const handleContentPieceCreated: GitSyncHookHandler<"contentPieceCreated"> = async (
  { gitData, directories, records },
  data
) => {
  const existingDirectory = directories.find((directory) => {
    return directory.contentGroupId.equals(data.contentPiece.contentGroupId);
  });

  if (!existingDirectory) return { directories, records };

  const output = processOutputContent(
    data.contentBuffer || jsonToBuffer({ type: "doc", content: [] }),
    data.contentPiece,
    gitData
  );
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
};
const handleContentPieceRemoved: GitSyncHookHandler<"contentPieceRemoved"> = async (
  { directories, records },
  data
) => {
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
};
const fixRemovedDuplicateRecords: GitSyncHookPostProcessor = ({ directories, records }) => {
  const newRecords: GitRecord<ObjectId>[] = [];
  const removedRecords = records.filter((record) => {
    return record.currentHash === "" && record.syncedHash !== "";
  });

  records.forEach((record) => {
    if (!record.currentHash) return;

    const removedRecord = removedRecords.find((removedRecord) => {
      return (
        removedRecord.contentPieceId.equals(record.contentPieceId) &&
        removedRecord.path === record.path
      );
    });

    if (!removedRecord) {
      newRecords.push(record);

      return;
    }

    removedRecords.splice(removedRecords.indexOf(removedRecord), 1);
    newRecords.push({
      ...record,
      syncedHash: removedRecord.syncedHash
    });
  });
  newRecords.push(...removedRecords);

  return {
    directories,
    records: newRecords
  };
};
const eventHandlers: { [E in GitSyncHookEvent]?: GitSyncHookHandler<E> } = {
  contentGroupMoved: handleContentGroupMoved,
  contentGroupUpdated: handleContentGroupUpdated,
  contentGroupCreated: handleContentGroupCreated,
  contentGroupRemoved: handleContentGroupRemoved,
  contentPieceMoved: handleContentPieceMoved,
  contentPieceUpdated: handleContentPieceUpdated,
  contentPieceCreated: handleContentPieceCreated,
  contentPieceRemoved: handleContentPieceRemoved
};
const runGitSyncHook = async <E extends GitSyncHookEvent>(
  ctx: AuthenticatedContext,
  event: E,
  data: GitSyncHookEventData[E]
): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        const gitDataCollection = getGitDataCollection(ctx.db);
        const gitData = await gitDataCollection.findOne({
          workspaceId: ctx.auth.workspaceId
        });
        const handler = eventHandlers[event];

        if (!gitData || !handler) return;

        const { directories, records } = await handler(
          {
            ctx,
            gitData,
            directories: gitData.directories,
            records: gitData.records
          },
          data
        );

        await gitDataCollection.updateOne(
          {
            workspaceId: ctx.auth.workspaceId
          },
          {
            $set: fixRemovedDuplicateRecords({
              directories,
              records
            })
          }
        );
        resolve();
      } catch (error) {
        resolve();
      }
    }, 0);
  });
};

export { runGitSyncHook };
