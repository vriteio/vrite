import { Profile } from "./profile";
import { PaginationParams, SendRequest } from "./request";
import { Role } from "./roles";
import { WorkspaceDetails } from "./workspace";

interface ListedMember {
  /**
   * Workspace membership ID
   */
  id: string;
  /**
   * ID of the user associated with the membership
   */
  userId?: string;
  /**
   * ID of the role assigned to the membership
   */
  roleId: string;
  /**
   * Email of the pending-invite user
   */
  email?: string;
  /**
   * Name of the pending-invite user
   */
  name?: string;
  /**
   * Whether the membership is a pending invite
   */
  pendingInvite: boolean;
  /**
   * Additional details about the profile of related user
   */
  profile?: Pick<Profile, "fullName" | "username" | "avatar">;
}
interface ListedWorkspace {
  /**
   * Workspace membership ID
   */
  id: string;
  /**
   * Additional details about the related workspace
   */
  workspace: WorkspaceDetails;
  /**
   * Additional details about the role assigned in the workspace
   */
  role?: Pick<Role, "id" | "name">;
}
interface WorkspaceMembershipsEndpoints {
  listMembers(input: PaginationParams): Promise<ListedMember[]>;
  listWorkspaces(input: PaginationParams): Promise<ListedWorkspace[]>;
  create(input: { email: string; name: string; roleId: string }): Promise<void>;
  update(input: { id: string; roleId: string }): Promise<void>;
  delete(input: { id: string }): Promise<void>;
}

const createWorkspaceMembershipsEndpoints = (
  sendRequest: SendRequest
): WorkspaceMembershipsEndpoints => ({
  listMembers: (input) => {
    return sendRequest<ListedMember[]>("GET", "/workspace-memberships/list-members", {
      params: input
    });
  },
  listWorkspaces: (input) => {
    return sendRequest<ListedWorkspace[]>("GET", "/workspace-memberships/list-workspaces", {
      params: input
    });
  },
  create: (input) => {
    return sendRequest("POST", "/workspace-memberships", {
      body: input
    });
  },
  update: (input) => {
    return sendRequest("PUT", "/workspace-memberships", {
      body: input
    });
  },
  delete: (input) => {
    return sendRequest("DELETE", "/workspace-memberships", {
      params: input
    });
  }
});

export { createWorkspaceMembershipsEndpoints };
export type { ListedMember, ListedWorkspace, WorkspaceMembershipsEndpoints };
