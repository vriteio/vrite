import * as listWebhooks from "./handlers/list";
import * as getWebhook from "./handlers/get";
import * as createWebhook from "./handlers/create";
import * as updateWebhook from "./handlers/update";
import * as deleteWebhook from "./handlers/delete";
import { z } from "zod";
import { router, procedure } from "#lib/trpc";
import { isAuthenticated } from "#lib/middleware";
import { subscribeToWebhookEvents } from "#events";

const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/webhooks";
const webhooksRouter = router({
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["webhooks:read"] }
    })
    .input(listWebhooks.inputSchema)
    .output(listWebhooks.outputSchema)
    .query(async ({ ctx, input }) => {
      return listWebhooks.handler(ctx, input);
    }),
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["webhooks:read"] }
    })
    .input(getWebhook.inputSchema)
    .output(getWebhook.outputSchema)
    .query(async ({ ctx, input }) => {
      return getWebhook.handler(ctx, input);
    }),
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageWebhooks"], token: ["webhooks:write"] }
    })
    .input(createWebhook.inputSchema)
    .output(createWebhook.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return createWebhook.handler(ctx, input);
    }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["manageWebhooks"], token: ["webhooks:write"] }
    })
    .input(updateWebhook.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateWebhook.handler(ctx, input);
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageWebhooks"], token: ["webhooks:write"] }
    })
    .input(deleteWebhook.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return deleteWebhook.handler(ctx, input);
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(({ ctx }) => {
    return subscribeToWebhookEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { webhooksRouter };
