import * as getWorkspace from "./handlers/get";
import * as updateWorkspace from "./handlers/update";
import * as createWorkspace from "./handlers/create";
import * as deleteWorkspace from "./handlers/delete";
import { z } from "zod";
import { subscribeToWorkspaceEvents } from "#events";
import { isAuthenticated, isAuthenticatedUser } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";

const authenticatedProcedure = procedure.use(isAuthenticated);
const authenticatedUserProcedure = procedure.use(isAuthenticatedUser);
const basePath = "/workspace";
const workspacesRouter = router({
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["workspace:read"] }
    })
    .input(z.void())
    .output(getWorkspace.outputSchema)
    .query(async ({ ctx }) => {
      return getWorkspace.handler(ctx);
    }),
  update: authenticatedProcedure
    .meta({
      permissions: { session: ["manageWorkspace"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(updateWorkspace.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateWorkspace.handler(ctx, input);
    }),
  create: authenticatedUserProcedure
    .input(createWorkspace.inputSchema)
    .output(createWorkspace.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return createWorkspace.handler(ctx, input);
    }),
  delete: authenticatedProcedure
    .meta({
      permissions: { session: ["manageWorkspace"] }
    })
    .input(z.void())
    .output(z.void())
    .mutation(async ({ ctx }) => {
      return deleteWorkspace.handler(ctx);
    }),
  changes: authenticatedProcedure.subscription(({ ctx }) => {
    return subscribeToWorkspaceEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { workspacesRouter };
