import * as listSnippets from "./handlers/list";
import * as getSnippet from "./handlers/get";
import * as createSnippet from "./handlers/create";
import * as deleteSnippet from "./handlers/delete";
import * as updateSnippet from "./handlers/update";
import { z } from "zod";
import { subscribeToSnippetEvents } from "#events";
import { isAuthenticated } from "#lib/middleware";
import { zodId } from "#lib/mongo";
import { procedure, router } from "#lib/trpc";

const basePath = "/snippets";
const authenticatedProcedure = procedure.use(isAuthenticated);
const snippetsRouter = router({
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["snippets:read"] }
    })
    .input(getSnippet.inputSchema)
    .output(getSnippet.outputSchema)
    .query(async ({ ctx, input }) => {
      return getSnippet.handler(ctx, input);
    }),
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["snippets:read"] }
    })
    .input(z.void())
    .output(listSnippets.outputSchema)
    .query(async ({ ctx }) => {
      return listSnippets.handler(ctx);
    }),
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["editSnippets"], token: ["snippets:write"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(createSnippet.inputSchema)
    .output(createSnippet.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return createSnippet.handler(ctx, input);
    }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["editSnippets"], token: ["snippets:write"] },
      requiredSubscriptionPlan: "personal"
    })
    .input(updateSnippet.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateSnippet.handler(ctx, input);
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["editSnippets"], token: ["snippets:read"] }
    })
    .input(deleteSnippet.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return deleteSnippet.handler(ctx, input);
    }),
  changes: authenticatedProcedure.subscription(async ({ ctx }) => {
    return subscribeToSnippetEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { snippetsRouter };
