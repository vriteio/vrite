import { SendRequest } from "./request";

// eslint-disable-next-line no-use-before-define
type ContextValue = string | number | boolean | ContextObject | ContextArray;

interface ContextObject {
  [x: string]: ContextValue;
}
interface ContextArray extends Array<ContextValue> {}
interface Extension {
  id: string;
  name: string;
  url: string;
  config: ContextObject;
  token: string;
}
interface ExtensionEndpoints {
  get(): Promise<Partial<Extension>>;
  getData(): Promise<ContextObject>;
  updateData(input: { data: ContextObject }): Promise<void>;
  updateContentPieceData(input: { contentPieceId: string; data: ContextObject }): Promise<void>;
}

const basePath = "/extension";
const createExtensionEndpoints = (sendRequest: SendRequest): ExtensionEndpoints => ({
  get: () => {
    return sendRequest<Partial<Extension>>("GET", `${basePath}`);
  },
  getData: () => {
    return sendRequest("GET", `${basePath}/data`);
  },
  updateData: (input) => {
    return sendRequest("PUT", `${basePath}/data`, { body: input });
  },
  updateContentPieceData: (input) => {
    return sendRequest("POST", `${basePath}/content-piece-data`, { body: input });
  }
});

export { createExtensionEndpoints };
export type { Extension, ExtensionEndpoints };
