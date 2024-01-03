import { AuthenticatedContext } from "#lib/middleware";
import { getGitDataCollection } from "#collections";
import { errors } from "#lib/errors";
import { publishGitDataEvent } from "#events";

const handler = async (ctx: AuthenticatedContext): Promise<void> => {
  const gitDataCollection = getGitDataCollection(ctx.db);
  const { deletedCount } = await gitDataCollection.deleteOne({
    workspaceId: ctx.auth.workspaceId
  });

  if (!deletedCount) throw errors.notFound("gitData");

  publishGitDataEvent(ctx, `${ctx.auth.workspaceId}`, { action: "reset", data: {} });
};

export { handler };
