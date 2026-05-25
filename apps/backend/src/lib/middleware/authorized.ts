import { Auth } from "#backend/services/auth";
import type { SessionData } from "#backend/services/auth";
import { ORPCError } from "@orpc/server";
import { base } from "../orpc";
import { config } from "../config";
import { Billing } from "#backend/services";

const hasPermission = (granted: string, required: string): boolean => {
  const isGrantedReadOnly = granted.startsWith("read:");
  const isRequiredReadOnly = required.startsWith("read:");
  const baseGrantedPermission = isGrantedReadOnly ? granted.slice(5) : granted;
  const baseRequiredPermission = isRequiredReadOnly ? required.slice(5) : required;

  if (isGrantedReadOnly && !required.startsWith("read:")) {
    // A read-only permission cannot satisfy a non-read permission
    return false;
  }

  if (baseRequiredPermission.startsWith(baseGrantedPermission)) {
    // Exact match or parent permission covers required permission
    return true;
  }

  return false;
};
const authorized = base.middleware(async ({ procedure, context, next }) => {
  const meta = procedure["~orpc"].meta;
  const sessionData = await Auth.getSessionData(context.reqHeaders!);
  const isAdmin = sessionData.session?.admin === true;

  // Perform permission checks
  if (meta.required) {
    // Admin sessions bypass all permission checks
    if (!isAdmin) {
      if (!meta.required[sessionData.type]) {
        throw new ORPCError("FORBIDDEN");
      }

      const requiredPermissions = (
        Array.isArray(meta.required[sessionData.type]) ? meta.required[sessionData.type] : []
      ) as string[];
      const permissions = (sessionData[sessionData.type]?.permissions || []) as string[];
      const missingPermissions = requiredPermissions.filter((required) => {
        return !permissions.some((granted) => hasPermission(granted, required));
      });

      if (missingPermissions.length > 0) {
        throw new ORPCError("FORBIDDEN", {
          message: `Missing required permissions: ${missingPermissions.join(", ")}`
        });
      }
    }
  }

  if ((sessionData.type === "key" && meta.trackUsage !== false) || meta.trackUsage === true) {
    const plan = sessionData.subscriptionPlan || "free";
    const limit = plan === "pro" ? Infinity : config.INCLUDED_API_CALLS;

    if (limit !== Infinity) {
      // TODO: Optimize frequent checks
      const usage = await Billing.Metering.getUsage({
        workspaceID: sessionData.workspaceID,
        plan
      });

      if (usage.totalUsage >= limit) {
        throw new ORPCError("FORBIDDEN", {
          message: `API request limit reached (${config.INCLUDED_API_CALLS} requests/month on the Free plan). Upgrade to Pro for higher limits.`
        });
      }
    }

    await Billing.Metering.recordUsage(sessionData.workspaceID);
  }

  return next({
    context: {
      auth: sessionData
    }
  });
});

export { authorized, hasPermission };
export type { SessionData };
