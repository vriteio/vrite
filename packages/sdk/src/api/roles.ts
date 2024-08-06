import { PaginationParams, PaginationMeta, SendRequest } from "./request";

type RolePermission =
  | "editContent"
  | "editSnippets"
  | "editMetadata"
  | "manageDashboard"
  | "manageTokens"
  | "manageWebhooks"
  | "manageWorkspace";
type RoleBaseType = "admin" | "viewer";
interface Role {
  /**
   * Role ID
   */
  id: string;
  /**
   * Role name
   */
  name: string;
  /**
   * Role description
   */
  description?: boolean;
  /**
   * Role permissions
   */
  permissions: RolePermission[];
  /**
   * Base role type (if applicable)
   */
  baseType?: RoleBaseType;
}
interface RolesEndpoints {
  get(input: Pick<Role, "id">): Promise<Role>;
  create(input: Omit<Role, "id" | "baseType">): Promise<Pick<Role, "id">>;
  update(input: Partial<Omit<Role, "id" | "baseType">> & Pick<Role, "id">): Promise<void>;
  delete(input: Pick<Role, "id">): Promise<void>;
  list(input: PaginationParams): Promise<Role[] & { meta: { pagination: PaginationMeta } }>;
}

const basePath = `/roles`;
const createRolesEndpoints = (sendRequest: SendRequest): RolesEndpoints => ({
  get: (input) => {
    return sendRequest<Role>("GET", `${basePath}`, {
      params: input
    });
  },
  create: (input) => {
    return sendRequest<Pick<Role, "id">>("POST", `${basePath}`, {
      body: input
    });
  },
  update: (input) => {
    return sendRequest("PUT", `${basePath}`, {
      body: input
    });
  },
  delete: (input) => {
    return sendRequest("DELETE", `${basePath}`, {
      params: input
    });
  },
  list: (input) => {
    return sendRequest<Role[], { pagination: PaginationMeta }>("GET", `${basePath}/list`, {
      params: input
    });
  }
});

export { createRolesEndpoints };
export type { Role, RoleBaseType, RolePermission, RolesEndpoints };
