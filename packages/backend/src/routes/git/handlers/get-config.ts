import { z } from "zod";
import { useGitSyncIntegration } from "#lib/git-sync";
import { AuthenticatedContext } from "#lib/middleware";
import { gitData, getGitDataCollection } from "#collections";
import { errors } from "#lib/errors";

const outputSchema = gitData;
const handler = async (ctx: AuthenticatedContext): Promise<z.infer<typeof outputSchema>> => {
  const gitDataCollection = getGitDataCollection(ctx.db);
  const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

  if (!gitData) throw errors.notFound("gitData");

  const gitSyncIntegration = useGitSyncIntegration(ctx, gitData);

  if (!gitSyncIntegration) throw errors.serverError();

  const records = gitSyncIntegration.getRecords();

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
      contentPieceId: `${record.contentPieceId}`,
      variantId: record.variantId ? `${record.variantId}` : undefined
    })),
    ...(gitData.contentGroupId ? { contentGroupId: `${gitData.contentGroupId}` } : {})
  };
};

export { handler, outputSchema };
