import type { KeyPermission, Permission } from "#backend/db";
import { ORPCError } from "@orpc/server";
import type { SessionData } from "./session";

interface TypedAuthorizationRequirements {
  key?: KeyPermission[] | true;
  session?: Permission[] | true;
}
interface ParsedPermission {
  access: string;
  resource: string;
}

type AuthorizationRequirements = TypedAuthorizationRequirements | true;

const parsePermission = (permission: string): ParsedPermission => {
  const [accessOrResource, readResource] = permission.split(":");

  return readResource
    ? { resource: readResource, access: accessOrResource }
    : { resource: accessOrResource, access: "write" };
};
const hasPermission = (granted: string, required: string): boolean => {
  const grantedPermission = parsePermission(granted);
  const requiredPermission = parsePermission(required);

  if (grantedPermission.resource !== requiredPermission.resource) return false;

  return grantedPermission.access === "write" || requiredPermission.access === "read";
};
const isAdminAuthorization = (auth: SessionData): boolean => {
  return auth.type === "session" && auth.session?.admin === true;
};
const getMissingAuthorizationPermissions = (
  auth: SessionData,
  required?: AuthorizationRequirements
): Array<KeyPermission | Permission> | null => {
  if (!required || required === true || isAdminAuthorization(auth)) return [];

  const requiredPermissions = required[auth.type];

  if (!requiredPermissions) return null;
  if (requiredPermissions === true) return [];

  const grantedPermissions =
    auth.type === "session" ? auth.session?.permissions : auth.key?.permissions;

  return requiredPermissions.filter((requiredPermission) => {
    return !grantedPermissions?.some((grantedPermission) => {
      return hasPermission(grantedPermission, requiredPermission);
    });
  });
};
const hasAuthorizationRequirements = (
  auth: SessionData,
  required?: AuthorizationRequirements
): boolean => {
  const missingPermissions = getMissingAuthorizationPermissions(auth, required);

  return missingPermissions !== null && missingPermissions.length === 0;
};
const assertAuthorizationRequirements = (
  auth: SessionData,
  required?: AuthorizationRequirements
): void => {
  const missingPermissions = getMissingAuthorizationPermissions(auth, required);

  if (missingPermissions?.length === 0) return;
  if (!missingPermissions) throw new ORPCError("FORBIDDEN");

  throw new ORPCError("FORBIDDEN", {
    message: `Missing required permissions: ${missingPermissions.join(", ")}`
  });
};
const hasAuthPermission = (auth: SessionData, required: KeyPermission | Permission): boolean => {
  if (isAdminAuthorization(auth)) return true;

  const permissions = auth.type === "session" ? auth.session?.permissions : auth.key?.permissions;

  return permissions?.some((permission) => hasPermission(permission, required)) ?? false;
};
export {
  assertAuthorizationRequirements,
  hasAuthorizationRequirements,
  hasAuthPermission,
  hasPermission,
  isAdminAuthorization
};
export type { AuthorizationRequirements };
