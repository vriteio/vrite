import * as createRole from "./handlers/create";
import * as updateRole from "./handlers/update";
import * as deleteRole from "./handlers/delete";
import * as listRoles from "./handlers/list";
import * as getRole from "./handlers/get";
import { z } from "zod";
import { subscribeToRoleEvents } from "#events";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";

const basePath = "/roles";
const authenticatedProcedure = procedure.use(isAuthenticated);
const rolesRouter = router({
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["roles:read"] }
    })
    .input(listRoles.inputSchema)
    .output(listRoles.outputSchema)
    .query(async ({ ctx, input }) => {
      return listRoles.handler(ctx, input);
    }),
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["roles:read"] }
    })
    .input(getRole.inputSchema)
    .output(getRole.outputSchema)
    .query(async ({ ctx, input }) => {
      return getRole.handler(ctx, input);
    }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["roles:write"] },
      requiredSubscriptionPlan: "team"
    })
    .input(updateRole.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateRole.handler(ctx, input);
    }),
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["roles:write"] },
      requiredSubscriptionPlan: "team"
    })
    .input(createRole.inputSchema)
    .output(createRole.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return createRole.handler(ctx, input);
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["roles:write"] }
    })
    .input(deleteRole.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return deleteRole.handler(ctx, input);
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(({ ctx }) => {
    return subscribeToRoleEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { rolesRouter };
