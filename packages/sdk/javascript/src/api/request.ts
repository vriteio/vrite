interface APIFetcherConfig {
  token: string;
  baseURL?: string;
  extensionId?: string;
  headers?: Record<string, string>;
}
type SendRequest = <O extends Record<string, any> | void = void>(
  method: "GET" | "PUT" | "DELETE" | "POST",
  path: string,
  options?: {
    params?: Record<string, string | number | boolean | undefined>;
    body?: Record<string, any>;
  }
) => Promise<O>;
type PaginationParams = {
  perPage?: number;
  page?: number;
};
interface APIFetcher {
  sendRequest: SendRequest;
  reconfigure: (config: APIFetcherConfig) => void;
  useSignal: (signal: AbortSignal | null) => void;
  getConfig: () => Required<APIFetcherConfig>;
  getSignal: () => AbortSignal | null;
}

const createAPIFetcher = (config: APIFetcherConfig): APIFetcher => {
  let baseURL = config.baseURL || "https://api.vrite.io";
  let extensionId = config.extensionId || "";
  let headers = config.headers || {};
  let signal: AbortSignal | null = null;
  let { token } = config;

  const sendRequest: SendRequest = async (method, path, options) => {
    try {
      const { default: fetch } = await import("isomorphic-unfetch");
      const response = await fetch(
        `${baseURL}${path}/?${encodeURI(
          Object.entries(options?.params || {})
            .filter(([, value]) => value)
            .map(([key, value]) => {
              return `${key}=${value}`;
            })
            .join("&")
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            ...(options?.body ? { "Content-Type": "application/json" } : {}),
            ...(extensionId ? { "X-Vrite-Extension-ID": extensionId } : {}),
            ...headers
          },
          body: options?.body ? JSON.stringify(options.body) : null,
          signal,
          method
        }
      );

      signal = null;

      let json = null;

      try {
        json = await response.json();

        if (!json) return;
      } catch (error) {
        return;
      }

      if (!response.ok) {
        throw json;
      }

      return json;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);

      throw error;
    }
  };
  const reconfigure = (config: Partial<APIFetcherConfig>): void => {
    baseURL = config.baseURL || baseURL;
    token = config.token || token;
    extensionId = config.extensionId || extensionId;
    headers = config.headers || headers;
  };
  const useSignal = (newSignal: AbortSignal | null): void => {
    signal = newSignal;
  };
  const getConfig = (): Required<APIFetcherConfig> => {
    return {
      baseURL,
      token,
      extensionId,
      headers
    };
  };
  const getSignal = (): AbortSignal | null => {
    return signal;
  };

  return { sendRequest, reconfigure, useSignal, getConfig, getSignal };
};

export { createAPIFetcher };
export type { SendRequest, APIFetcherConfig, PaginationParams };
