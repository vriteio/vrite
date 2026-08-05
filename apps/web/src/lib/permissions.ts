interface PermissionResource<Resource extends string, Permission extends string> {
  id: Resource;
  read?: Permission;
  write: Permission;
}

type AccessLevel = "default" | "read" | "write";

const createPermissionAccessMapper = <Resource extends string, Permission extends string>(input: {
  resources: Array<PermissionResource<Resource, Permission>>;
}) => {
  const emptyAccess = (): Record<Resource, AccessLevel> => {
    return Object.fromEntries(
      input.resources.map((resource) => {
        return [resource.id, "default"];
      })
    ) as Record<Resource, AccessLevel>;
  };
  const permissionsToAccess = (permissions: Permission[]): Record<Resource, AccessLevel> => {
    const access = emptyAccess();

    for (const permission of permissions) {
      const resource = input.resources.find((candidate) => {
        return candidate.read === permission || candidate.write === permission;
      });

      if (!resource) continue;

      if (resource.write === permission) {
        access[resource.id] = "write";
      } else if (access[resource.id] !== "write") {
        access[resource.id] = "read";
      }
    }
    return access;
  };
  const accessToPermissions = (access: Record<Resource, AccessLevel>): Permission[] => {
    return input.resources.flatMap((resource) => {
      const level = access[resource.id];

      if (level === "write") return [resource.write];
      if (level === "read" && resource.read) return [resource.read];

      return [];
    });
  };

  return { accessToPermissions, emptyAccess, permissionsToAccess };
};

export { createPermissionAccessMapper };
export type { PermissionResource, AccessLevel };
