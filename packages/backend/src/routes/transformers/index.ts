import * as createTransformer from "./handlers/create";
import * as deleteTransformer from "./handlers/delete";
import * as listTransformers from "./handlers/list";
import { z } from "zod";
import { subscribeToTransformerEvents } from "#events";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";

const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/transformers";
const transformersRouter = router({
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspace:write"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(createTransformer.inputSchema)
    .output(createTransformer.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return createTransformer.handler(ctx, input);
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspace:write"] }
    })
    .input(deleteTransformer.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return deleteTransformer.handler(ctx, input);
    }),
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["workspace:read"] }
    })
    .input(z.void())
    .output(listTransformers.outputSchema)
    .query(async ({ ctx }) => {
      return listTransformers.handler(ctx);
    }),

  changes: authenticatedProcedure.input(z.void()).subscription(async ({ ctx }) => {
    return subscribeToTransformerEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { transformersRouter };
