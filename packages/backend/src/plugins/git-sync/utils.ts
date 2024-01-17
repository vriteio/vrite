import { ObjectId } from "mongodb";
import { FullGitData, GitDirectory, GitRecord, getGitDataCollection } from "#collections";
import { publishGitDataEvent } from "#events";
import {
  OutputContentProcessor,
  createOutputContentProcessor,
  useGitSyncIntegration
} from "#lib/git-sync";
import { AuthenticatedContext } from "#lib/middleware";
import { UnderscoreID } from "#lib/mongo";

type GitSyncHookData = {
  directories: GitDirectory<ObjectId>[];
  records: GitRecord<ObjectId>[];
};
type GitSyncHookPostProcessor = (input: GitSyncHookData) => GitSyncHookData;
type GitSyncHookProcessor<D extends object> = (
  input: GitSyncHookData & {
    ctx: AuthenticatedContext;
    gitData: UnderscoreID<FullGitData<ObjectId>>;
    outputContentProcessor: OutputContentProcessor;
  },
  data: D
) => Promise<GitSyncHookData>;

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
const createGitSyncHandler = <D extends object>(process: GitSyncHookProcessor<D>) => {
  return async (ctx: AuthenticatedContext, data: D) => {
    try {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({
        workspaceId: ctx.auth.workspaceId
      });

      if (!gitData || !process) return;

      const gitSyncIntegration = useGitSyncIntegration(ctx, gitData);

      if (!gitSyncIntegration) return;

      const outputContentProcessor = await createOutputContentProcessor(
        ctx,
        gitSyncIntegration.getTransformer()
      );
      const { directories, records } = await process(
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
    } catch (error) {
      ctx.fastify.log.error("Git Sync Error:", error);
    }
  };
};

export { createGitSyncHandler };
export type { GitSyncHookProcessor };
