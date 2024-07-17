import { SendRequest } from "./request";

interface WorkspaceDetails {
  /**
   * Workspace ID
   */
  id: string;
  /**
   * Workspace name
   */
  name: string;
  /**
   * Workspace description
   */
  description?: string;
  /**
   * Workspace logo URL
   */
  logo?: string;
}
interface WorkspaceEndpoints {
  get(): Promise<WorkspaceDetails>;
}

const basePath = "/workspace";
const createWorkspaceEndpoints = (sendRequest: SendRequest): WorkspaceEndpoints => ({
  get: () => {
    return sendRequest<WorkspaceDetails>("GET", `${basePath}`);
  }
});

export { createWorkspaceEndpoints };
export type { WorkspaceDetails, WorkspaceEndpoints };
