import * as getUserSettings from "./handlers/get";
import * as getWorkspaceId from "./handlers/get-workspace-id";
import * as updateUserSettings from "./handlers/update";
import { z } from "zod";
import { subscribeToUserSettingsEvents } from "#events";
import { isAuthenticatedUser, isAuthenticated } from "#lib/middleware";
import { router, procedure } from "#lib/trpc";

const authenticatedUserProcedure = procedure.use(isAuthenticatedUser);
const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/user-settings";
const userSettingsRouter = router({
  update: authenticatedUserProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { token: ["userSettings:write"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(updateUserSettings.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateUserSettings.handler(ctx, input);
    }),
  get: authenticatedUserProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["userSettings:read"] }
    })
    .input(z.void())
    .output(getUserSettings.outputSchema)
    .query(async ({ ctx }) => {
      return getUserSettings.handler(ctx);
    }),

  getWorkspaceId: authenticatedProcedure
    .input(z.void())
    .output(getWorkspaceId.outputSchema)
    .query(async ({ ctx }) => {
      return getWorkspaceId.handler(ctx);
    }),
  changes: authenticatedUserProcedure.input(z.void()).subscription(async ({ ctx }) => {
    return subscribeToUserSettingsEvents(ctx, `${ctx.auth.userId}`);
  })
});

export { userSettingsRouter };
