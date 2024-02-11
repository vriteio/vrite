import * as getConfig from "./handlers/get-config";
import * as resetConfig from "./handlers/reset-config";
import * as configure from "./handlers/configure";
import * as initialSync from "./handlers/initial-sync";
import * as pull from "./handlers/pull";
import * as resolveConflict from "./handlers/resolve-conflict";
import * as commit from "./handlers/commit";
import { z } from "zod";
import { subscribeToGitDataEvents } from "#events";
import { procedure, router } from "#lib/trpc";
import { isAuthenticated } from "#lib/middleware";

const authenticatedProcedure = procedure.use(isAuthenticated);
const gitRouter = router({
  pull: authenticatedProcedure
    .meta({
      permissions: { session: ["manageGit"] },
      requiredConfig: ["githubApp"],
      requiredSubscriptionPlan: "personal"
    })
    .input(pull.inputSchema)
    .output(pull.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return pull.handler(ctx, input);
    }),
  commit: authenticatedProcedure
    .meta({
      permissions: { session: ["manageGit"] },
      requiredConfig: ["githubApp"],
      requiredSubscriptionPlan: "personal"
    })
    .input(commit.inputSchema)
    .output(commit.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return commit.handler(ctx, input);
    }),
  resolveConflict: authenticatedProcedure
    .meta({
      permissions: { session: ["manageGit"] },
      requiredConfig: ["githubApp"],
      requiredSubscriptionPlan: "personal"
    })
    .input(resolveConflict.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return resolveConflict.handler(ctx, input);
    }),
  initialSync: authenticatedProcedure
    .meta({
      permissions: { session: ["manageGit"] },
      requiredConfig: ["githubApp"],
      requiredSubscriptionPlan: "personal"
    })
    .input(z.void())
    .output(z.void())
    .mutation(async ({ ctx }) => {
      return initialSync.handler(ctx);
    }),
  configure: authenticatedProcedure
    .meta({
      permissions: { session: ["manageGit"] },
      requiredConfig: ["githubApp"],
      requiredSubscriptionPlan: "personal"
    })
    .input(configure.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return configure.handler(ctx, input);
    }),
  config: authenticatedProcedure
    .input(z.void())
    .output(getConfig.outputSchema)
    .query(async ({ ctx }) => {
      return getConfig.handler(ctx);
    }),
  reset: authenticatedProcedure
    .meta({
      permissions: { session: ["manageGit"] }
    })
    .input(z.void())
    .output(z.void())
    .mutation(async ({ ctx }) => {
      return resetConfig.handler(ctx);
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(async ({ ctx }) => {
    return subscribeToGitDataEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { gitRouter };
