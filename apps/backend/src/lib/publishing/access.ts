import { hasPermission, type SessionData } from "#backend/lib/policy";

const canManagePublishing = (auth: SessionData): boolean => {
  if (auth.type === "session" && auth.session?.admin) return true;

  const permissions =
    auth.type === "session" ? auth.session?.permissions || [] : auth.key?.permissions || [];

  return permissions.some((permission) => hasPermission(permission, "publishing"));
};
const canReadPublishing = (auth: SessionData): boolean => {
  if (auth.type === "session" && auth.session?.admin) return true;

  const permissions =
    auth.type === "session" ? auth.session?.permissions || [] : auth.key?.permissions || [];

  return permissions.some((permission) => hasPermission(permission, "read:publishing"));
};

export { canManagePublishing, canReadPublishing };
