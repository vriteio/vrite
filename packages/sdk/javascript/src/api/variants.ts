import { SendRequest } from "./request";

interface Variant {
  /**
   * Variant ID
   */
  id: string;
  /**
   * Variant key
   */
  key: string;
  /**
   * Variant label
   */
  label: string;
  /**
   * Variant description
   */
  description?: string;
}
interface VariantsEndpoints {
  create(input: Omit<Variant, "id">): Promise<Pick<Variant, "id">>;
  update(input: Partial<Variant> & Pick<Variant, "id">): Promise<void>;
  delete(query: Pick<Variant, "id">): Promise<void>;
  list(): Promise<Variant[]>;
}

const basePath = `/variants`;
const createVariantsEndpoints = (sendRequest: SendRequest): VariantsEndpoints => ({
  create: (input) => {
    return sendRequest("POST", `${basePath}`, {
      body: input
    });
  },
  update: (input) => {
    return sendRequest("PUT", `${basePath}`, {
      body: input
    });
  },
  delete: (query) => {
    return sendRequest("DELETE", `${basePath}`, {
      params: query
    });
  },
  list: () => {
    return sendRequest("GET", `${basePath}/list`);
  }
});

export { createVariantsEndpoints };
export type { Variant, VariantsEndpoints };
