import { z } from "zod";
import { procedure, router } from "#lib/trpc";
import { isAuthenticated } from "#lib/middleware";
import { getWorkspacesCollection } from "#collections";
import { errors } from "#lib/errors";

const authenticatedProcedure = procedure.use(isAuthenticated);
const billingRouter = router({
  checkout: authenticatedProcedure
    .meta({ permissions: { session: ["manageBilling"] } })
    .input(z.object({ plan: z.enum(["personal", "team"]) }))
    .output(z.object({ url: z.string() }))
    .query(async ({ ctx, input }) => {
      const url = await ctx.fastify.billing.checkout(`${ctx.auth.workspaceId}`, input.plan);

      return { url };
    }),
  portal: authenticatedProcedure
    .meta({ permissions: { session: ["manageBilling"] } })
    .input(z.void())
    .output(z.object({ url: z.string() }))
    .query(async ({ ctx }) => {
      const url = await ctx.fastify.billing.portal(`${ctx.auth.workspaceId}`);

      return { url };
    }),
  usage: authenticatedProcedure
    .input(z.void())
    .output(z.object({ usage: z.number() }))
    .query(async ({ ctx }) => {
      const usage = await ctx.fastify.billing.usage.get(`${ctx.auth.workspaceId}`);

      return { usage };
    }),
  switchPlan: authenticatedProcedure
    .meta({ permissions: { session: ["manageBilling"] } })
    .input(z.object({ plan: z.enum(["personal", "team"]) }))
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      await ctx.fastify.billing.switchPlan(`${ctx.auth.workspaceId}`, input.plan);
    }),
  canSwitchPlan: authenticatedProcedure
    .input(z.object({ plan: z.enum(["personal", "team"]) }))
    .output(z.object({ canSwitch: z.boolean() }))
    .query(async ({ input, ctx }) => {
      const canSwitch = await ctx.fastify.billing.canSwitchPlan(
        `${ctx.auth.workspaceId}`,
        input.plan
      );

      return { canSwitch };
    }),
  subscription: authenticatedProcedure
    .input(z.void())
    .output(z.object({ plan: z.string().optional(), expiresAt: z.string(), status: z.string() }))
    .query(async ({ ctx }) => {
      const workspacesCollection = getWorkspacesCollection(ctx.db);
      const workspace = await workspacesCollection.findOne({ _id: ctx.auth.workspaceId });

      if (!workspace || !workspace.subscriptionExpiresAt || !workspace.subscriptionStatus) {
        throw errors.serverError();
      }

      return {
        plan: workspace.subscriptionPlan,
        expiresAt: workspace.subscriptionExpiresAt,
        status: workspace.subscriptionStatus
      };
    })
});

export { billingRouter };
