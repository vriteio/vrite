import type { KeyPermission, Permission } from "#web/lib/client";

const hasPermission = (permissions: Permission[], required: Permission) => {
  if (permissions.includes(required)) return true;
  if (required.startsWith("read:")) {
    return permissions.includes(required.slice(5) as Permission);
  }

  return false;
};
const hasKeyPermission = (permissions: KeyPermission[], required: KeyPermission) => {
  if (permissions.includes(required)) return true;
  if (required.startsWith("read:")) {
    return permissions.includes(required.slice(5) as KeyPermission);
  }

  return false;
};

export { hasPermission, hasKeyPermission };
