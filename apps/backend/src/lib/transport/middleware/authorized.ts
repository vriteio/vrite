import { Auth } from "#backend/services/auth";
import type { SessionData } from "#backend/lib/policy";
import { ORPCError } from "@orpc/server";
import { base } from "../orpc";
import { config } from "#backend/lib/config";
import { Billing } from "#backend/services/billing";
import { hasPermission } from "#backend/lib/policy";
import type { KeyPermission, Permission } from "#backend/db";

interface AuthorizationRequirements {
  key?: KeyPermission[] | true;
  session?: Permission[] | "admin" | true;
}

const authorizeSession = (sessionData: SessionData, required?: AuthorizationRequirements): void => {
  if (!required) return;
  if (sessionData.type === "session" && sessionData.session?.admin) return;

  const requiredPermissions = required[sessionData.type];

  if (!requiredPermissions || requiredPermissions === "admin") {
    throw new ORPCError("FORBIDDEN");
  }
  if (requiredPermissions === true) return;

  const permissions =
    sessionData.type === "session"
      ? sessionData.session?.permissions || []
      : sessionData.key?.permissions || [];
  const missingPermissions = requiredPermissions.filter((requiredPermission) => {
    return !permissions.some((grantedPermission) => {
      return hasPermission(grantedPermission, requiredPermission);
    });
  });

  if (missingPermissions.length > 0) {
    throw new ORPCError("FORBIDDEN", {
      message: `Missing required permissions: ${missingPermissions.join(", ")}`
    });
  }
};
const shouldTrackUsage = (sessionData: SessionData, trackUsage?: boolean): boolean => {
  return (sessionData.type === "key" && trackUsage !== false) || trackUsage === true;
};
const checkPlanAccess = (sessionData: SessionData, requireProPlan?: boolean): void => {
  if (!requireProPlan || sessionData.subscriptionPlan === "pro") return;

  throw new ORPCError("FORBIDDEN", {
    message: "This action requires an Andesine Pro subscription"
  });
};
const checkUsageAllowance = async (sessionData: SessionData): Promise<void> => {
  const plan = sessionData.subscriptionPlan || "free";
  const limit = plan === "pro" ? Infinity : config.INCLUDED_API_CALLS;

  if (limit === Infinity) return;

  const usage = await Billing.Metering.getUsage({
    workspaceID: sessionData.workspaceID,
    plan
  });

  if (usage.totalUsage >= limit) {
    throw new ORPCError("FORBIDDEN", {
      message: `API request limit reached (${config.INCLUDED_API_CALLS} requests/month on the Free plan). Upgrade to Pro for higher limits.`
    });
  }
};
const recordUsage = async (sessionData: SessionData): Promise<void> => {
  await Billing.Metering.recordUsage({ workspaceID: sessionData.workspaceID });
};

const authorized = base.middleware(async ({ procedure, context, next }) => {
  const meta = procedure["~orpc"].meta;
  const sessionData = await Auth.getSessionData({
    headers: context.reqHeaders!,
    requireWorkspace: meta.requireWorkspace !== false
  });

  authorizeSession(sessionData, meta.required);
  checkPlanAccess(sessionData, meta.requireProPlan);

  if (shouldTrackUsage(sessionData, meta.trackUsage)) {
    await checkUsageAllowance(sessionData);
    await recordUsage(sessionData);
  }

  return next({
    context: {
      auth: sessionData
    }
  });
});

export { authorized };
export type { SessionData };
