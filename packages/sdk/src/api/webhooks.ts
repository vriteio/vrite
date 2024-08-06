import { PaginationMeta, PaginationParams, SendRequest } from "./request";

type WebhookEvent =
  | "contentPieceUpdated"
  | "contentPieceAdded"
  | "contentPieceRemoved"
  | "contentGroupAdded"
  | "contentGroupRemoved"
  | "memberInvited"
  | "memberAdded"
  | "memberRemoved";
interface Webhook {
  /**
   * Webhook ID
   */
  id: string;
  /**
   * Webhook target URL
   */
  url: string;
  /**
   * Webhook name
   */
  name: string;
  /**
   * Webhook description
   */
  description?: string;
  /**
   * Webhook signing secret
   */
  secret?: string;
  /**
   * Webhook metadata containing details about the Webhook configuration
   */
  metadata?: {
    contentGroupId: string;
  };
  /**
   * Webhook trigger event
   */
  event: WebhookEvent;
}
interface WebhooksEndpoints {
  get(input: Pick<Webhook, "id">): Promise<Omit<Webhook, "secret"> & { extension?: boolean }>;
  create(input: Omit<Webhook, "id">): Promise<Pick<Webhook, "id">>;
  update(input: Partial<Omit<Webhook, "secret">> & Pick<Webhook, "id">): Promise<void>;
  delete(query: Pick<Webhook, "id">): Promise<void>;
  list(
    input: PaginationParams & { extensionOnly?: boolean }
  ): Promise<
    Array<Omit<Webhook, "secret"> & { extension?: boolean }> & {
      meta: { pagination: PaginationMeta };
    }
  >;
}

const basePath = `/webhooks`;
const createWebhooksEndpoints = (sendRequest: SendRequest): WebhooksEndpoints => ({
  get: (input) => {
    return sendRequest("GET", `${basePath}`, {
      params: input
    });
  },
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
  list: (input) => {
    return sendRequest("GET", `${basePath}/list`, {
      params: input
    });
  }
});

export { createWebhooksEndpoints };
export type { Webhook, WebhookEvent, WebhooksEndpoints };
