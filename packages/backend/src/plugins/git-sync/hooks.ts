/* eslint-disable sonarjs/no-identical-functions */
import { createGenericOutputContentProcessor } from "./process-content";
import { OutputContentProcessor } from "./types";
import { AuthenticatedContext } from "../../lib/middleware";
import { UnderscoreID } from "../../lib/mongo";
import { jsonToBuffer } from "../../lib/content-processing";
import { ObjectId } from "mongodb";
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
} from "#collections";
import { publishGitDataEvent } from "#events";
import { createPlugin } from "#lib/plugin";

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
    outputContentProcessor: OutputContentProcessor;
  },
  data: GitSyncHookEventData[E]
) => Promise<GitSyncHookData>;

const handleContentGroupMoved: GitSyncHookHandler<"contentGroupMoved"> = async (
  { ctx, directories, records, outputContentProcessor },
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

  const nestedContentGroups = (
    await contentGroupsCollection
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
      .toArray()
  ).sort((contentGroupA, contentGroupB) => {
    // sort ascending by ancestors length
    if (contentGroupA.ancestors.length < contentGroupB.ancestors.length) return -1;
    if (contentGroupA.ancestors.length > contentGroupB.ancestors.length) return 1;

    return 0;
  });
  const contentPieces = await contentPiecesCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      contentGroupId: { $in: nestedContentGroups.map((contentGroup) => contentGroup._id) }
    })
    .toArray();
  const contents = await contentsCollection
    .find({
      contentPieceId: { $in: contentPieces.map((contentPiece) => contentPiece._id) }
    })
    .toArray();
  const outputContentProcessorBatch = [];

  for await (const contentGroup of nestedContentGroups) {
    const ancestorDirectory = newDirectories.find((directory) => {
      return directory.contentGroupId.equals(contentGroup.ancestors.at(-1)!);
    });

    if (!ancestorDirectory) continue;

    newDirectories.push({
      contentGroupId: contentGroup._id,
      path: ancestorDirectory.path
        .split("/")
        .concat(contentGroup.name || `${contentGroup._id}`)
        .filter(Boolean)
        .join("/")
    });

    for await (const contentPiece of contentPieces) {
      if (!contentPiece.contentGroupId.equals(contentGroup._id)) continue;

      const { content } =
        contents.find((content) => {
          return content.contentPieceId.equals(contentPiece._id);
        }) || {};

      if (!content) continue;

      outputContentProcessorBatch.push({
        content,
        contentPiece,
        contentGroup
      });
    }
  }

  const processedOutputContents = await outputContentProcessor.processBatch(
    outputContentProcessorBatch.map(({ content, contentPiece }) => {
      return {
        buffer: Buffer.from(content.buffer),
        contentPiece
      };
    })
  );

  outputContentProcessorBatch.forEach(({ contentPiece, contentGroup }, index) => {
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
      currentHash: crypto.createHash("md5").update(processedOutputContents[index]).digest("hex"),
      syncedHash: ""
    });
  });

  return { directories: newDirectories, records: newRecords };
};
const handleContentGroupUpdated: GitSyncHookHandler<"contentGroupUpdated"> = async (
  { ctx, gitData, directories, records, outputContentProcessor },
  data
) => {
  if (!data.name && !data.ancestor) return { directories, records };

  if (!data.name) {
    return handleContentGroupMoved(
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
  { ctx, directories, records, outputContentProcessor },
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
};
const handleContentPieceUpdated: GitSyncHookHandler<"contentPieceUpdated"> = async (
  { ctx, directories, records, outputContentProcessor },
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
      contentPieceId: data.contentPiece._id
    })) || {};

  if (!content) return { directories, records: newRecords };

  const output = await outputContentProcessor.process({
    buffer: Buffer.from(content.buffer),
    contentPiece: data.contentPiece
  });
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
  { directories, records, outputContentProcessor },
  data
) => {
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

        const outputContentProcessor = await createGenericOutputContentProcessor(ctx, gitData);
        const { directories, records } = await handler(
          {
            ctx,
            gitData,
            directories: gitData.directories,
            records: gitData.records,
            outputContentProcessor
          },
          data
        );
        const output = fixRemovedDuplicateRecords({
          directories,
          records
        });

        await gitDataCollection.updateOne(
          {
            workspaceId: ctx.auth.workspaceId
          },
          {
            $set: {
              directories: output.directories,
              records: output.records
            }
          }
        );
        publishGitDataEvent(ctx, `${ctx.auth.workspaceId}`, {
          action: "update",
          data: {
            directories: output.directories.map((directory) => ({
              ...directory,
              contentGroupId: `${directory.contentGroupId}`
            })),
            records: output.records.map((record) => ({
              ...record,
              contentPieceId: `${record.contentPieceId}`
            }))
          }
        });
        resolve();
      } catch (error) {
        resolve();
      }
    }, 0);
  });
};
const gitSyncPlugin = createPlugin(async (fastify) => {
  fastify.routeCallbacks.register("contentPieces.create", (ctx, data) => {
    runGitSyncHook(ctx, "contentPieceCreated", {
      contentPiece: data.contentPiece,
      contentBuffer: data.contentBuffer
    });
  });
  fastify.routeCallbacks.register("contentPieces.delete", (ctx, data) => {
    runGitSyncHook(ctx, "contentPieceRemoved", { contentPiece: data.contentPiece });
  });
  fastify.routeCallbacks.register("contentPieces.move", (ctx, data) => {
    runGitSyncHook(ctx, "contentPieceMoved", {
      contentPiece: data.updatedContentPiece,
      contentGroupId: `${data.updatedContentPiece.contentGroupId}`
    });
  });
  fastify.routeCallbacks.register("contentPieces.update", (ctx, data) => {
    if (data.contentPiece.contentGroupId.equals(data.updatedContentPiece.contentGroupId)) {
      runGitSyncHook(ctx, "contentPieceUpdated", { contentPiece: data.updatedContentPiece });
    } else {
      runGitSyncHook(ctx, "contentPieceMoved", {
        contentPiece: data.updatedContentPiece,
        contentGroupId: `${data.updatedContentPiece.contentGroupId}`
      });
    }
  });
});

export { gitSyncPlugin, runGitSyncHook };
