import * as createVariant from "./handlers/create";
import * as updateVariant from "./handlers/update";
import * as deleteVariant from "./handlers/delete";
import * as listVariants from "./handlers/list";
import { z } from "zod";
import { subscribeToVariantEvents } from "#events";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";

const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/variants";
const variantsRouter = router({
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageVariants"], token: ["variants:write"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(createVariant.inputSchema)
    .output(createVariant.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return createVariant.handler(ctx, input);
    }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["manageVariants"], token: ["variants:write"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(updateVariant.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateVariant.handler(ctx, input);
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageVariants"], token: ["variants:write"] }
    })
    .input(deleteVariant.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return deleteVariant.handler(ctx, input);
    }),
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["variants:read"] }
    })
    .input(z.void())
    .output(listVariants.outputSchema)
    .query(async ({ ctx }) => {
      return listVariants.handler(ctx);
    }),

  changes: authenticatedProcedure.input(z.void()).subscription(async ({ ctx }) => {
    return subscribeToVariantEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { variantsRouter };
