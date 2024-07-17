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
   * IDs of ancestor content groups, ordered from furthest to closest
   */
  ancestors: string[];
  /**
   * IDs of directly-descendant content groups
   */
  descendants: string[];
}
interface ContentGroupWithSubtree {
  /**
   * Content group name
   */
  name: string;
  /**
   * Content group ID
   */
  id: string;
  /**
   * IDs of ancestor content groups, ordered from furthest to closest
   */
  ancestors: string[];
  /**
   * Descendant content groups
   */
  descendants: ContentGroupWithSubtree[];
}
interface ContentGroupsEndpoints {
  list<Subtree extends true | false = false>(input?: {
    ancestor?: string;
    subtree?: Subtree;
  }): Promise<Subtree extends true ? ContentGroupWithSubtree[] : ContentGroup[]>;
  get<Subtree extends true | false = false>(
    input: Pick<ContentGroup, "id"> & { subtree?: Subtree }
  ): Promise<Subtree extends true ? ContentGroupWithSubtree : ContentGroup>;
  create(
    input: Omit<ContentGroup, "id" | "ancestors" | "descendants"> & { ancestor?: string }
  ): Promise<Pick<ContentGroup, "id">>;
  update(
    input: Partial<Omit<ContentGroup, "ancestors" | "descendants">> & Pick<ContentGroup, "id">
  ): Promise<void>;
  update(
    input: Partial<Omit<ContentGroup, "ancestors" | "descendants" | "name">> &
      Pick<ContentGroup, "id"> & { ancestor?: string }
  ): Promise<void>;
  delete(input: Pick<ContentGroup, "id">): Promise<void>;
}

const basePath = "/content-groups";
const createContentGroupsEndpoints = (sendRequest: SendRequest): ContentGroupsEndpoints => ({
  get: <Subtree extends true | false = false>(input: { id: string; subtree?: Subtree }) => {
    return sendRequest<Subtree extends true ? ContentGroupWithSubtree : ContentGroup>(
      "GET",
      `${basePath}`,
      {
        params: input
      }
    );
  },
  list: <Subtree extends true | false = false>(input: { ancestor?: string; subtree?: Subtree }) => {
    return sendRequest<Subtree extends true ? ContentGroupWithSubtree[] : ContentGroup[]>(
      "GET",
      `${basePath}/list`,
      {
        params: input
      }
    );
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
export type { ContentGroup, ContentGroupWithSubtree, ContentGroupsEndpoints };
