import * as getToken from "./handlers/get";
import * as updateToken from "./handlers/update";
import * as createToken from "./handlers/create";
import * as deleteToken from "./handlers/delete";
import * as listTokens from "./handlers/list";
import * as regenerateToken from "./handlers/regenerate";
import { z } from "zod";
import { subscribeToTokenEvents } from "#events";
import { isAuthenticated } from "#lib/middleware";
import { router, procedure } from "#lib/trpc";

const authenticatedProcedure = procedure.use(isAuthenticated);
const tokensRouter = router({
  get: authenticatedProcedure
    .input(getToken.inputSchema)
    .output(getToken.outputSchema)
    .query(async ({ ctx, input }) => {
      return getToken.handler(ctx, input);
    }),
  delete: authenticatedProcedure
    .meta({
      permissions: { session: ["manageTokens"] }
    })
    .input(deleteToken.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return deleteToken.handler(ctx, input);
    }),
  list: authenticatedProcedure
    .input(listTokens.inputSchema)
    .output(listTokens.outputSchema)
    .query(async ({ ctx, input }) => {
      return listTokens.handler(ctx, input);
    }),
  create: authenticatedProcedure
    .meta({
      permissions: { session: ["manageTokens"] }
    })
    .input(createToken.inputSchema)
    .output(createToken.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return createToken.handler(ctx, input);
    }),
  update: authenticatedProcedure
    .meta({
      permissions: { session: ["manageTokens"] }
    })
    .input(updateToken.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateToken.handler(ctx, input);
    }),
  regenerate: authenticatedProcedure
    .meta({
      permissions: { session: ["manageTokens"] }
    })
    .input(regenerateToken.inputSchema)
    .output(regenerateToken.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return regenerateToken.handler(ctx, input);
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(({ ctx }) => {
    return subscribeToTokenEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { tokensRouter };
