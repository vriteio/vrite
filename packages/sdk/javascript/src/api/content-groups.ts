import { SendRequest } from "./request";

interface ContentGroup {
  /**
   * Content group name
   */
  name: string;
  /**
   * Content group ID
   */
  id: string;
  /**
   * Is content group edit-locked
   */
  locked?: boolean;
}
interface ContentGroupsEndpoints {
  list(): Promise<ContentGroup[]>;
  create(input: Omit<ContentGroup, "id">): Promise<Pick<ContentGroup, "id">>;
  update(input: Partial<ContentGroup> & Pick<ContentGroup, "id">): Promise<void>;
  delete(input: Pick<ContentGroup, "id">): Promise<void>;
}

const basePath = "/content-groups";
const createContentGroupsEndpoints = (sendRequest: SendRequest): ContentGroupsEndpoints => ({
  list: () => {
    return sendRequest<ContentGroup[]>("GET", `${basePath}/list`);
  },
  create: (input) => {
    return sendRequest<Pick<ContentGroup, "id">>("POST", `${basePath}`, {
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
  }
});

export { createContentGroupsEndpoints };
export type { ContentGroup, ContentGroupsEndpoints };
