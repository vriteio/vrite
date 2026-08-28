import {
  type RequestHeadersPluginContext,
  type ResponseHeadersPluginContext
} from "@orpc/server/plugins";
import { os } from "@orpc/server";
import type { AuthorizationRequirements, SessionData } from "#backend/lib/policy";

interface ORPCContext extends RequestHeadersPluginContext, ResponseHeadersPluginContext {}
interface WSORPCContext {
  auth: SessionData;
}
interface ORPCMeta {
  requireWorkspace?: boolean;
  requireProPlan?: boolean;
  trackUsage?: boolean;
  required?: AuthorizationRequirements;
}

const base = os.$context<ORPCContext>().$meta<ORPCMeta>({});
const wsBase = os.$context<WSORPCContext>().$meta<ORPCMeta>({});

export { base, wsBase };
