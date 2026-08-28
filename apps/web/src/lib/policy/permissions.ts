import type { Permission } from "#web/lib/api";

const hasPermission = (permissions: Permission[], required: Permission) => {
  if (permissions.includes(required)) return true;
  if (required.startsWith("read:")) {
    return permissions.includes(required.slice(5) as Permission);
  }

  return false;
};

export { hasPermission };
