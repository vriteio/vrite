import { JSONContent } from "./content-pieces";
import { PaginationParams, SendRequest } from "./request";

type Snippet<IncludeContent extends true | false = false> = {
  /**
   * Snippet ID
   */
  id: string;
  /**
   * Name
   */
  name: string;
} & (IncludeContent extends true
  ? {
      /**
       * JSON content
       */
      content: JSONContent;
    }
  : {});

interface SnippetsEndpoints {
  get<IncludeContent extends true | false = false>(
    input: Pick<Snippet, "id"> & {
      content?: IncludeContent;
    }
  ): Promise<Snippet<IncludeContent>>;
  create(input: Pick<Snippet, "name"> & { content?: string }): Promise<Pick<Snippet, "id">>;
  update(
    input: Partial<Pick<Snippet, "name"> & { content?: string }> & Pick<Snippet, "id">
  ): Promise<void>;
  delete(input: Pick<Snippet, "id">): Promise<void>;
  list<IncludeContent extends true | false = false>(input: {
    content?: IncludeContent;
  }): Promise<Array<Snippet<IncludeContent>>>;
}

const basePath = "/snippets";
const createSnippetsEndpoints = (sendRequest: SendRequest): SnippetsEndpoints => ({
  get: <IncludeContent extends true | false = false>(
    input: Pick<Snippet, "id"> & {
      content?: IncludeContent;
    }
  ) => {
    return sendRequest<Snippet<IncludeContent>>("GET", `${basePath}`, {
      params: input
    });
  },
  create: (input) => {
    return sendRequest<Pick<Snippet, "id">>("POST", `${basePath}`, {
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
  list: <IncludeContent extends true | false = false>(input: { content?: IncludeContent }) => {
    return sendRequest<Array<Snippet<IncludeContent>>>("GET", `${basePath}/list`, {
      params: input
    });
  }
});

export { createSnippetsEndpoints };
export type { Snippet, SnippetsEndpoints };
