import { SendRequest } from "./request";

interface RemoteTransformer {
  /**
   * Transformer ID
   */
  id: string;
  /**
   * Transformer label
   */
  label: string;
  /**
   * Transformer input URL
   */
  input: string;
  /**
   * Transformer output URL
   */
  output: string;
  /**
   * Transformer max batch size (1-1000)
   */
  maxBatchSize: number;
}
interface TransformersEndpoints {
  create(input: Omit<RemoteTransformer, "id">): Promise<Pick<RemoteTransformer, "id">>;
  delete(query: Pick<RemoteTransformer, "id">): Promise<void>;
  list(): Promise<Array<RemoteTransformer & { inUse?: boolean }>>;
}

const basePath = `/transformers`;
const createTransformersEndpoints = (sendRequest: SendRequest): TransformersEndpoints => ({
  create: (input) => {
    return sendRequest("POST", `${basePath}`, {
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

export { createTransformersEndpoints };
export type { RemoteTransformer, TransformersEndpoints };
