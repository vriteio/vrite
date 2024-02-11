import * as getContentGroup from "./handlers/get";
import * as updateContentGroup from "./handlers/update";
import * as createContentGroup from "./handlers/create";
import * as deleteContentGroup from "./handlers/delete";
import * as listContentGroups from "./handlers/list";
import * as moveContentGroup from "./handlers/move";
import * as reorderContentGroup from "./handlers/reorder";
import * as listAncestors from "./handlers/list-ancestors";
import { z } from "zod";
import { subscribeToContentGroupEvents } from "#events";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";

const basePath = "/content-groups";
const authenticatedProcedure = procedure.use(isAuthenticated);
const contentGroupsRouter = router({
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["contentGroups:read"] }
    })
    .input(getContentGroup.inputSchema)
    .output(getContentGroup.outputSchema)
    .query(async ({ ctx, input }) => {
      return getContentGroup.handler(ctx, input);
    }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["manageDashboard"], token: ["contentGroups:write"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(updateContentGroup.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateContentGroup.handler(ctx, input);
    }),
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageDashboard"], token: ["contentGroups:write"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(createContentGroup.inputSchema)
    .output(createContentGroup.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return createContentGroup.handler(ctx, input);
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageDashboard"], token: ["contentGroups:write"] }
    })
    .input(deleteContentGroup.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return deleteContentGroup.handler(ctx, input);
    }),
  listAncestors: authenticatedProcedure
    .input(listAncestors.inputSchema)
    .output(listAncestors.outputSchema)
    .query(async ({ ctx, input }) => {
      return listAncestors.handler(ctx, input);
    }),
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["contentGroups:read"] }
    })
    .input(listContentGroups.inputSchema)
    .output(listContentGroups.outputSchema)
    .query(async ({ ctx, input }) => {
      return listContentGroups.handler(ctx, input);
    }),
  move: authenticatedProcedure
    .meta({
      permissions: { session: ["manageDashboard"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(moveContentGroup.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return moveContentGroup.handler(ctx, input);
    }),
  reorder: authenticatedProcedure
    .meta({
      permissions: { session: ["manageDashboard"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(reorderContentGroup.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return reorderContentGroup.handler(ctx, input);
    }),
  changes: authenticatedProcedure.subscription(async ({ ctx }) => {
    return subscribeToContentGroupEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { contentGroupsRouter };
