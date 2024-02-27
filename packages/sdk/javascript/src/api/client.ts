import { createContentGroupsEndpoints, ContentGroupsEndpoints } from "./content-groups";
import {
  ContentPiece,
  ContentPiecesEndpoints,
  createContentPiecesEndpoints
} from "./content-pieces";
import { APIFetcherConfig, createAPIFetcher } from "./request";
import { UserSettingsEndpoints, createUserSettingsEndpoints } from "./user-settings";
import { TagsEndpoints, createTagsEndpoints } from "./tags";
import { ProfileEndpoints, createProfileEndpoints } from "./profile";
import { WebhooksEndpoints, createWebhooksEndpoints } from "./webhooks";
import { WorkspaceEndpoints, createWorkspaceEndpoints } from "./workspace";
import { RolesEndpoints, createRolesEndpoints } from "./roles";
import { WorkspaceSettingsEndpoints, createWorkspaceSettingsEndpoints } from "./workspace-settings";
import {
  WorkspaceMembershipsEndpoints,
  createWorkspaceMembershipsEndpoints
} from "./workspace-memberships";
import { ExtensionEndpoints, createExtensionEndpoints } from "./extension";
import { VariantsEndpoints, createVariantsEndpoints } from "./variants";
import { TransformersEndpoints, createTransformersEndpoints } from "./transformers";
import PolyfilledEventSource from "@sanity/eventsource";

interface SearchResult {
  contentPieceId: string;
  contentPiece: Omit<ContentPiece, "content" | "coverWidth">;
  breadcrumb: string[];
  content: string;
}
interface ClientConfig extends APIFetcherConfig {}
interface Client {
  contentGroups: ContentGroupsEndpoints;
  contentPieces: ContentPiecesEndpoints;
  tags: TagsEndpoints;
  profile: ProfileEndpoints;
  userSettings: UserSettingsEndpoints;
  webhooks: WebhooksEndpoints;
  workspace: WorkspaceEndpoints;
  roles: RolesEndpoints;
  workspaceSettings: WorkspaceSettingsEndpoints;
  workspaceMemberships: WorkspaceMembershipsEndpoints;
  extension: ExtensionEndpoints;
  variants: VariantsEndpoints;
  transformers: TransformersEndpoints;
  search(input: {
    query: string;
    limit?: number;
    variantId?: string;
    contentGroupId?: string;
    contentPieceId?: string;
    byTitle?: boolean;
  }): Promise<SearchResult[]>;
  ask(input: {
    query: string;
    variantId?: string;
    contentGroupId?: string;
    contentPieceId?: string;
    onChunk?(chunk: string, content: string): void;
    onEnd?(content: string): void;
    onError?(error: string): void;
  }): void;
  useSignal(signal: AbortSignal | null): Client;
  reconfigure(config: ClientConfig): Client;
}

const createClient = (config: ClientConfig): Client => {
  const { sendRequest, reconfigure, getConfig, getSignal, useSignal } = createAPIFetcher(config);
  const client: Client = {
    contentGroups: createContentGroupsEndpoints(sendRequest),
    contentPieces: createContentPiecesEndpoints(sendRequest),
    tags: createTagsEndpoints(sendRequest),
    profile: createProfileEndpoints(sendRequest),
    userSettings: createUserSettingsEndpoints(sendRequest),
    webhooks: createWebhooksEndpoints(sendRequest),
    workspace: createWorkspaceEndpoints(sendRequest),
    roles: createRolesEndpoints(sendRequest),
    workspaceSettings: createWorkspaceSettingsEndpoints(sendRequest),
    workspaceMemberships: createWorkspaceMembershipsEndpoints(sendRequest),
    extension: createExtensionEndpoints(sendRequest),
    variants: createVariantsEndpoints(sendRequest),
    transformers: createTransformersEndpoints(sendRequest),
    search(input) {
      return sendRequest("GET", "/search", {
        params: input
      });
    },
    async ask(input) {
      let content = "";

      const source = new PolyfilledEventSource(
        `${getConfig().baseURL}/search/ask?query=${encodeURIComponent(input.query)}`,
        {
          headers: {
            "Authorization": `Bearer ${getConfig().token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          }
        }
      );

      source.addEventListener("error", (event) => {
        const errorEvent = event as { message?: string };

        if (errorEvent.message) {
          return input.onError?.(errorEvent.message);
        } else {
          source.close();

          return input.onEnd?.(content);
        }
      });
      source.addEventListener("message", (event) => {
        const chunk = decodeURIComponent(event.data);

        content += chunk;
        input.onChunk?.(chunk, content);
      });
      getSignal()?.addEventListener("abort", () => {
        source.close();
      });
      useSignal(null);
    },
    useSignal(signal) {
      useSignal(signal);

      return client;
    },
    reconfigure(config) {
      reconfigure(config);

      return client;
    }
  };

  return client;
};

export { createClient };
export type { Client, SearchResult };
