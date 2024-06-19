import * as listVersions from "./handlers/list";
import * as updateVersions from "./handlers/update";
import * as getVersion from "./handlers/get";
import * as restoreVersion from "./handlers/restore";
import { z } from "zod";
import { subscribeToVersionEvents } from "#events";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";

const authenticatedProcedure = procedure.use(isAuthenticated);
const versionsRouter = router({
  list: authenticatedProcedure
    .input(listVersions.inputSchema)
    .output(listVersions.outputSchema)
    .query(async ({ ctx, input }) => {
      return listVersions.handler(ctx, input);
    }),
  update: authenticatedProcedure
    .input(updateVersions.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateVersions.handler(ctx, input);
    }),
  get: authenticatedProcedure
    .input(getVersion.inputSchema)
    .output(getVersion.outputSchema)
    .query(async ({ ctx, input }) => {
      return getVersion.handler(ctx, input);
    }),
  restore: authenticatedProcedure
    .input(restoreVersion.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return restoreVersion.handler(ctx, input);
    }),
  changes: authenticatedProcedure.subscription(async ({ ctx }) => {
    return subscribeToVersionEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { versionsRouter };
