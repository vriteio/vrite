import { githubRouter } from "./github";
import { GitDataEvent, publishGitDataEvent } from "./events";
import { processRecords } from "./process-records";
import { z } from "zod";
import { procedure, router } from "#lib/trpc";
import { getGitDataCollection, gitData } from "#database";
import { errors, isAuthenticated } from "#lib";
import { createEventSubscription } from "#lib/pub-sub";

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

      const records = processRecords(gitData);

      return {
        ...(gitData.contentGroupId ? { contentGroupId: `${gitData.contentGroupId}` } : {}),
        id: `${gitData._id}`,
        provider: gitData.provider,
        github: gitData.github,
        lastCommitDate: gitData.lastCommitDate,
        lastCommitId: gitData.lastCommitId,
        directories: gitData.directories.map((directory) => ({
          ...directory,
          contentGroupId: `${directory.contentGroupId}`
        })),
        records: records.map((record) => ({
          ...record,
          contentPieceId: `${record.contentPieceId}`
        }))
      };
    }),
  reset: authenticatedProcedure
    .meta({
      permissions: { session: ["manageGit"] }
    })
    .input(z.void())
    .output(z.void())
    .mutation(async ({ ctx }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const { deletedCount } = await gitDataCollection.deleteOne({
        workspaceId: ctx.auth.workspaceId
      });

      if (!deletedCount) throw errors.notFound("gitData");

      publishGitDataEvent(ctx, `${ctx.auth.workspaceId}`, { action: "reset", data: {} });
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(async ({ ctx }) => {
    return createEventSubscription<GitDataEvent>(ctx, `gitData:${ctx.auth.workspaceId}`);
  })
});

export { gitRouter };
