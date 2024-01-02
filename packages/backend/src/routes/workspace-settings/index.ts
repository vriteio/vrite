import * as getWorkspaceSettings from "./handlers/get";
import * as updateWorkspaceSettings from "./handlers/update";
import * as getPrettierSchema from "./handlers/prettier-schema";
import { z } from "zod";
import { subscribeToWorkspaceSettingsEvents } from "#events";
import { isAuthenticated } from "#lib/middleware";
import { router, procedure } from "#lib/trpc";

const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/workspace-settings";
const workspaceSettingsRouter = router({
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["workspace:read"] }
    })
    .input(z.void())
    .output(getWorkspaceSettings.outputSchema)
    .query(async ({ ctx }) => {
      return getWorkspaceSettings.handler(ctx);
    }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspace:write"] }
    })
    .input(updateWorkspaceSettings.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateWorkspaceSettings.handler(ctx, input);
    }),
  prettierSchema: procedure
    .meta({ openapi: { method: "GET", path: `${basePath}/schemas/prettier` } })
    .input(z.void())
    .output(getPrettierSchema.outputSchema)
    .query(({ ctx }) => {
      return getPrettierSchema.handler(ctx);
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(({ ctx }) => {
    return subscribeToWorkspaceSettingsEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { workspaceSettingsRouter };
