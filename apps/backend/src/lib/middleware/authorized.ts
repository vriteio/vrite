import { Auth } from "#backend/services/auth";
import type { SessionData } from "#backend/services/auth";
import { ORPCError } from "@orpc/server";
import { base } from "../orpc";
import { config } from "../config";
import { Billing } from "#backend/services";

const hasPermission = (granted: string, required: string): boolean => {
  const parsePermission = (permission: string) => {
    const [accessOrResource, readResource] = permission.split(":");

    return readResource
      ? { resource: readResource, access: accessOrResource }
      : { resource: accessOrResource, access: "write" };
  };
  const grantedPermission = parsePermission(granted);
  const requiredPermission = parsePermission(required);

  if (grantedPermission.resource !== requiredPermission.resource) return false;

  return grantedPermission.access === "write" || requiredPermission.access === "read";
};
const authorized = base.middleware(async ({ procedure, context, next }) => {
  const meta = procedure["~orpc"].meta;
  const sessionData = await Auth.getSessionData(context.reqHeaders!, {
    requireWorkspace: meta.requireWorkspace !== false
  });
  const isAdmin = sessionData.session?.admin === true;

  // Perform permission checks
  if (meta.required) {
    // Admin sessions bypass all permission checks
    if (!isAdmin) {
      if (!meta.required[sessionData.type]) {
        throw new ORPCError("FORBIDDEN");
      }

      if (meta.required[sessionData.type] === "admin") {
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
