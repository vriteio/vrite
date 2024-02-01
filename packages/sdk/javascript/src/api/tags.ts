import { PaginationParams, SendRequest } from "./request";

type TagColor =
  | "gray"
  | "red"
  | "pink"
  | "orange"
  | "amber"
  | "purple"
  | "indigo"
  | "blue"
  | "cyan"
  | "green"
  | "teal"
  | "lime"
  | "fuchsia"
  | "emerald";
type Tag = {
  /**
   * Label describing the tag
   */
  label?: string;
  /**
   * Tag color
   */
  color: TagColor;
  /**
   * Tag ID
   */
  id: string;
};
interface TagsEndpoints {
  get(input: Pick<Tag, "id">): Promise<Tag>;
  update(input: Partial<Tag> & Pick<Tag, "id">): Promise<void>;
  create(input: Omit<Tag, "id">): Promise<Pick<Tag, "id">>;
  delete(input: Pick<Tag, "id">): Promise<void>;
  list(input: PaginationParams): Promise<Tag[]>;
}

const basePath = "/tags";
const createTagsEndpoints = (sendRequest: SendRequest): TagsEndpoints => ({
  get: (input) => {
    return sendRequest<Tag>("GET", `${basePath}`, {
      params: input
    });
  },
  update: (input) => {
    return sendRequest("PUT", `${basePath}`, {
      body: input
    });
  },
  create: (input) => {
    return sendRequest<Pick<Tag, "id">>("PUT", `${basePath}`, {
      body: input
    });
  },
  delete: (input) => {
    return sendRequest("DELETE", `${basePath}`, {
      params: input
    });
  },
  list: (input: PaginationParams) => {
    return sendRequest<Tag[]>("GET", `${basePath}/list`, {
      params: input
    });
  }
});

export { createTagsEndpoints };
export type { Tag, TagColor, TagsEndpoints };
