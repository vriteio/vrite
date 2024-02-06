import * as getProfile from "./handlers/get";
import * as updateProfile from "./handlers/update";
import { z } from "zod";
import { subscribeToUserEvents } from "#events";
import { isAuthenticated } from "#lib/middleware";
import { router, procedure } from "#lib/trpc";

const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/profile";
const usersRouter = router({
  changes: authenticatedProcedure.input(z.void()).subscription(async ({ ctx }) => {
    return subscribeToUserEvents(ctx, `${ctx.auth.userId}`);
  }),
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}`, protect: true },
      permissions: { token: ["profile:read"] }
    })
    .input(z.void())
    .output(getProfile.outputSchema)
    .query(async ({ ctx }) => {
      return getProfile.handler(ctx);
    }),
  update: authenticatedProcedure
    .input(updateProfile.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return updateProfile.handler(ctx, input);
    })
});

export { usersRouter };
