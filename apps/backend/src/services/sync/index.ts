import { getExplorerTree } from "./get-explorer-tree";
import {
  canReadCollections,
  canReadEntries,
  canReadInvites,
  canReadKeys,
  canReadMemberships,
  canReadRoles,
  canReadViewer,
  canReadWorkspace,
  getViewerAccess,
  getWorkspaceMetadata,
  isWorkspaceEventVisible
} from "./get-workspace-metadata";

const Sync = {
  getExplorerTree,
  getWorkspaceMetadata,
  getViewerAccess,
  isWorkspaceEventVisible,
  canReadEntries,
  canReadCollections,
  canReadMemberships,
  canReadInvites,
  canReadRoles,
  canReadKeys,
  canReadWorkspace,
  canReadViewer
};

export { Sync };
