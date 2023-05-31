import { PaginationParams, SendRequest } from "./request";

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
  get(input: Pick<Webhook, "id">): Promise<Webhook>;
  create(input: Omit<Webhook, "id">): Promise<Pick<Webhook, "id">>;
  update(input: Partial<Webhook> & Pick<Webhook, "id">): Promise<void>;
  delete(query: Pick<Webhook, "id">): Promise<void>;
  list(input: PaginationParams & { extensionOnly?: boolean }): Promise<Webhook[]>;
}

const basePath = `/webhooks`;
const createWebhooksEndpoints = (sendRequest: SendRequest): WebhooksEndpoints => ({
  get: (input) => {
    return sendRequest<Webhook>("GET", `${basePath}`, {
      params: input
    });
  },
  create: (input) => {
    return sendRequest<Pick<Webhook, "id">>("POST", `${basePath}`, {
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
    return sendRequest<Webhook[]>("GET", `${basePath}/list`, {
      params: input
    });
  }
});

export { createWebhooksEndpoints };
export type { Webhook, WebhookEvent, WebhooksEndpoints };
