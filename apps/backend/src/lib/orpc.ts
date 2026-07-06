import { RequestHeadersPluginContext, ResponseHeadersPluginContext } from "@orpc/server/plugins";
import { os } from "@orpc/server";
import type { SessionData } from "#backend/lib/middleware";
import { KeyPermission, Permission } from "#backend/db";

interface ORPCContext extends RequestHeadersPluginContext, ResponseHeadersPluginContext {}
interface WSORPCContext {
  auth: SessionData;
}
interface ORPCMeta {
  requireWorkspace?: boolean;
  trackUsage?: boolean;
  required?: {
    key?: KeyPermission[] | true;
    session?: Permission[] | "admin" | true;
  };
}

const base = os.$context<ORPCContext>().$meta<ORPCMeta>({});
const wsBase = os.$context<WSORPCContext>().$meta<ORPCMeta>({});

export { base, wsBase };
