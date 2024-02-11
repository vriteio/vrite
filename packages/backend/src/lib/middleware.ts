import { processAuth } from "./auth";
import { Context } from "./context";
import { errors } from "./errors";
import { Meta, middleware } from "./trpc";
import { ObjectId } from "mongodb";

interface AuthMiddlewareContextExtension<W extends true | false = true> {
  auth: {
    userId: ObjectId;
    workspaceId: W extends true ? ObjectId : never;
  };
}
interface AuthenticatedContext extends Context, AuthMiddlewareContextExtension<true> {}

const authMiddleware = async <W extends true | false = true>(
  ctx: Context,
  meta?: Meta,
  workspaceBound?: W
): Promise<AuthMiddlewareContextExtension<W>> => {
  const requiredSessionPermissions = meta?.permissions?.session || [];
  const requiredTokenPermissions = meta?.permissions?.token || [];
  const requiredPlan = meta?.requiredSubscriptionPlan;
  const auth = await processAuth(ctx);

  if (!auth) {
    throw errors.unauthorized();
  }

  if (
    ctx.fastify.hostConfig.billing &&
    requiredPlan &&
    auth.data.subscriptionPlan !== "team" &&
    auth.data.subscriptionPlan !== requiredPlan
  ) {
    throw errors.forbidden();
  }

  if (auth.type === "session") {
    if (
      auth.data.baseType !== "admin" &&
      requiredSessionPermissions.some((permission) => !auth.data.permissions.includes(permission))
    ) {
      throw errors.forbidden();
    }

    if (
      ctx.fastify.hostConfig.billing &&
      requiredPlan &&
      auth.data.subscriptionPlan !== requiredPlan
    ) {
      throw errors.forbidden();
    }

    try {
      return {
        auth: {
          userId: new ObjectId(auth.data.userId),
          ...(workspaceBound ? { workspaceId: new ObjectId(auth.data.workspaceId) } : {})
        }
      } as AuthMiddlewareContextExtension<W>;
    } catch (error) {
      throw errors.badRequest("workspaceError");
    }
  }

  if (requiredTokenPermissions.some((permission) => !auth.data.permissions.includes(permission))) {
    throw errors.forbidden();
  }

  ctx.fastify.billing.usage.log(auth.data.workspaceId, 1);

  return {
    auth: {
      userId: new ObjectId(auth.data.userId),
      workspaceId: new ObjectId(auth.data.workspaceId)
    }
  } as AuthMiddlewareContextExtension<W>;
};
const isAuthenticated = middleware(async ({ ctx, next, meta }) => {
  const authContextExtension = await authMiddleware(ctx, meta, true);

  return next({ ctx: authContextExtension });
});
const isAuthenticatedUser = middleware(async ({ ctx, next, meta }) => {
  const authContextExtension = await authMiddleware(ctx, meta, false);

  return next({ ctx: authContextExtension });
});
const isEnabled = middleware(async ({ ctx, next, meta }) => {
  const requiredConfig = meta?.requiredConfig || [];

  if (requiredConfig.some((property) => !ctx.fastify.hostConfig[property])) {
    throw errors.serverError();
  }

  return next();
});

export { isAuthenticated, isAuthenticatedUser, isEnabled };
export type { AuthenticatedContext };
