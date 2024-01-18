import { z } from "zod";
import { filterRecords, useGitProvider } from "#lib/git-sync";
import { AuthenticatedContext } from "#lib/middleware";
import { gitData, getGitDataCollection } from "#collections";
import { errors } from "#lib/errors";

const outputSchema = gitData;
const handler = async (ctx: AuthenticatedContext): Promise<z.infer<typeof outputSchema>> => {
  const gitDataCollection = getGitDataCollection(ctx.db);
  const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });
  const gitProvider = useGitProvider(ctx, gitData);

  if (!gitData || !gitProvider) throw errors.serverError();

  const records = filterRecords(gitData.records, gitProvider.data);

  return {
    ...gitData,
    contentGroupId: undefined,
    id: `${gitData._id}`,
    directories: gitData.directories.map((directory) => ({
      ...directory,
      contentGroupId: `${directory.contentGroupId}`
    })),
    records: records.map((record) => ({
      ...record,
      contentPieceId: `${record.contentPieceId}`
    })),
    ...(gitData.contentGroupId ? { contentGroupId: `${gitData.contentGroupId}` } : {})
  };
};

export { handler, outputSchema };
