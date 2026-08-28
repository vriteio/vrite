import { Auth } from "#backend/services/auth";
import { assertAuthorizationRequirements, type SessionData } from "#backend/lib/policy";
import { ORPCError } from "@orpc/server";
import { base } from "../orpc";
import { config } from "#backend/lib/config";
import { Billing } from "#backend/services/billing";
const shouldTrackUsage = (sessionData: SessionData, trackUsage?: boolean): boolean => {
  return (sessionData.type === "key" && trackUsage !== false) || trackUsage === true;
};
const checkPlanAccess = (sessionData: SessionData, requireProPlan?: boolean): void => {
  if (!requireProPlan || sessionData.subscriptionPlan === "pro") return;

  throw new ORPCError("FORBIDDEN", {
    message: "This action requires an Andesine Pro subscription"
  });
};
const getUsageAllowance = async (sessionData: SessionData) => {
  const plan = sessionData.subscriptionPlan || "free";

  return Billing.Metering.getUsage({
    workspaceID: sessionData.workspaceID,
    plan
  });
};
const checkUsageAllowance = (
  sessionData: SessionData,
  usage: Awaited<ReturnType<typeof getUsageAllowance>>,
  headers?: Headers
): void => {
  const limit = sessionData.subscriptionPlan === "pro" ? Infinity : config.INCLUDED_API_CALLS;

  if (limit !== Infinity && usage.totalUsage >= limit) {
    const retryAfter = Math.max(Math.ceil((usage.resetDate.getTime() - Date.now()) / 1000), 1);

    headers?.set("Retry-After", `${retryAfter}`);

    throw new ORPCError("TOO_MANY_REQUESTS", {
      message: `API request limit reached (${config.INCLUDED_API_CALLS} requests/month on the Free plan). Upgrade to Pro for higher limits.`
    });
  }
};
const recordUsage = async (sessionData: SessionData): Promise<void> => {
  await Billing.Metering.recordUsage({ workspaceID: sessionData.workspaceID });
};
const setUsageHeaders = (
  headers: Headers | undefined,
  usage: Awaited<ReturnType<typeof getUsageAllowance>>
): void => {
  if (!headers) return;

  const remaining = Math.max(usage.limit - usage.totalUsage, 0);
  const reset = Math.ceil(usage.resetDate.getTime() / 1000);

  headers.set("X-API-Usage", `${usage.totalUsage}`);
  headers.set("X-API-Usage-Limit", `${usage.limit}`);
  headers.set("X-API-Usage-Reset", `${reset}`);
  headers.set("X-RateLimit-Limit", `${usage.limit}`);
  headers.set("X-RateLimit-Remaining", `${remaining}`);
  headers.set("X-RateLimit-Reset", `${reset}`);
};

const authorized = base.middleware(async ({ procedure, context, next }) => {
  const meta = procedure["~orpc"].meta;
  const sessionData = await Auth.getSessionData({
    headers: context.reqHeaders!,
    requireWorkspace: meta.requireWorkspace !== false
  });

  assertAuthorizationRequirements(sessionData, meta.required);
  checkPlanAccess(sessionData, meta.requireProPlan);

  let usage: Awaited<ReturnType<typeof getUsageAllowance>> | undefined;

  if (shouldTrackUsage(sessionData, meta.trackUsage)) {
    usage = await getUsageAllowance(sessionData);
    setUsageHeaders(context.resHeaders, usage);
    checkUsageAllowance(sessionData, usage, context.resHeaders);
  }

  const result = await next({
    context: {
      auth: sessionData
    }
  });

  if (usage) {
    try {
      await recordUsage(sessionData);
      usage = { ...usage, totalUsage: usage.totalUsage + 1 };
    } catch (error) {
      console.error("Failed to record API usage", {
        error,
        workspaceID: sessionData.workspaceID
      });
    }

    setUsageHeaders(context.resHeaders, usage);
  }

  return result;
});
const authenticatedRoute = base.meta({ required: true }).use(authorized);
const sessionRoute = base.meta({ required: { session: true } }).use(authorized);

export { authenticatedRoute, authorized, sessionRoute };
export type { SessionData };
