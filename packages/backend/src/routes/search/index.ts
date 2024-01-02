import * as search from "./handlers/search";
import * as ask from "./handlers/ask";
import { isAuthenticated, isEnabled } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";

const authenticatedProcedure = procedure.use(isAuthenticated).use(isEnabled);
const basePath = "/search";
const searchRouter = router({
  search: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}`, protect: true },
      requiredConfig: ["search"],
      permissions: { token: ["contentPieces:read"] }
    })
    .input(search.inputSchema)
    .output(search.outputSchema)
    .query(async ({ ctx, input }) => {
      return search.handler(ctx, input);
    }),
  ask: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/ask`, protect: true },
      requiredConfig: ["aiSearch"],
      permissions: { token: ["contentPieces:read"] }
    })
    .input(ask.inputSchema)
    .output(ask.outputSchema)
    .query(async ({ ctx, input }) => {
      return ask.handler(ctx, input);
    })
});

export { searchRouter };
