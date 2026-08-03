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

export { hasPermission };
