import { githubRouter } from "./github";
import { GitDataEvent, publishEvent } from "./events";
import { z } from "zod";
import { procedure, router } from "#lib/trpc";
import { GitData, getGitDataCollection, gitData } from "#database";
import { errors, isAuthenticated } from "#lib";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

const authenticatedProcedure = procedure.use(isAuthenticated);
const gitRouter = router({
  github: githubRouter,
  config: authenticatedProcedure
    .input(z.void())
    .output(gitData)
    .query(async ({ ctx }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({ workspaceId: ctx.auth.workspaceId });

      if (!gitData) throw errors.notFound("gitData");

      return {
        ...(gitData.contentGroupId ? { contentGroupId: `${gitData.contentGroupId}` } : {}),
        id: `${gitData._id}`,
        provider: gitData.provider,
        github: gitData.github,
        lastCommitDate: gitData.lastCommitDate,
        lastCommitId: gitData.lastCommitId,
        records: gitData.records.map((record) => ({
          ...record,
          contentPieceId: `${record.contentPieceId}`
        }))
      };
    }),
  reset: authenticatedProcedure
    .input(z.void())
    .output(z.void())
    .mutation(async ({ ctx }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const { deletedCount } = await gitDataCollection.deleteOne({
        workspaceId: ctx.auth.workspaceId
      });

      if (!deletedCount) throw errors.notFound("gitData");

      publishEvent(ctx, `${ctx.auth.workspaceId}`, { action: "reset", data: {} });
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(async ({ ctx }) => {
    return createEventSubscription<GitDataEvent>(ctx, `gitData:${ctx.auth.workspaceId}`);
  })
});

export { gitRouter };
