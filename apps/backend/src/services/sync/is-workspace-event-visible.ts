import type { KeyPermission, Permission } from "#backend/db";
import { hasPermission, type SessionData } from "#backend/lib/middleware";

const canAccess = (
  auth: SessionData,
  required: {
    session?: Permission[] | true;
    key?: KeyPermission[] | true;
  }
): boolean => {
  if (auth.type === "session" && auth.session?.admin) {
    return true;
  }

  const requiredPermissions = required[auth.type];

  if (!requiredPermissions) {
    return false;
  }

  if (requiredPermissions === true) {
    return true;
  }

  const grantedPermissions = (auth[auth.type]?.permissions || []) as string[];

  return requiredPermissions.every((permission) => {
    return grantedPermissions.some((grantedPermission) => {
      return hasPermission(grantedPermission, permission);
    });
  });
};

const isWorkspaceEventVisible = (
  auth: SessionData,
  event: {
    action: string;
  }
) => {
  if (event.action.startsWith("entry:")) {
    return canAccess(auth, {
      session: true,
      key: ["read:entries"]
    });
  }

  if (event.action.startsWith("collection:")) {
    return canAccess(auth, {
      session: true,
      key: ["read:collections"]
    });
  }

  if (event.action.startsWith("membership:")) {
    return canAccess(auth, {
      session: ["content"],
      key: ["read:memberships"]
    });
  }

  if (event.action.startsWith("invite:")) {
    return canAccess(auth, {
      session: ["workspace"],
      key: ["memberships"]
    });
  }

  if (event.action.startsWith("role:")) {
    return canAccess(auth, {
      session: ["content"],
      key: ["read:roles"]
    });
  }

  if (event.action.startsWith("key:")) {
    return canAccess(auth, {
      session: ["workspace"]
    });
  }

  if (event.action.startsWith("workspace:")) {
    return canAccess(auth, {
      session: true
    });
  }

  return false;
};

export { isWorkspaceEventVisible };
