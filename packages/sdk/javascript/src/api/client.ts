import { createContentGroupsEndpoints, ContentGroupsEndpoints } from "./content-groups";
import { ContentPiecesEndpoints, createContentPiecesEndpoints } from "./content-pieces";
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
  search(input: {
    query: string;
    limit?: number;
    variantId?: string;
    contentPieceID?: string;
  }): Promise<
    Array<{
      contentPieceId: string;
      breadcrumb: string[];
      content: string;
    }>
  >;
  reconfigure(config: ClientConfig): void;
}

const createClient = (config: ClientConfig): Client => {
  const { sendRequest, reconfigure } = createAPIFetcher(config);

  return {
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
    search(input) {
      return sendRequest("GET", "/search", {
        params: input
      });
    },
    reconfigure
  };
};

export { createClient };
export type { Client };
