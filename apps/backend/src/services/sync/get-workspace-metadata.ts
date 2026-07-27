import {
  type Collection,
  type Entry,
  type Key,
  type KeyPermission,
  type Permission,
  type Role,
  toWorkspaceID,
  workspacesDB
} from "#backend/db";
import { hasPermission, type SessionData } from "#backend/lib/middleware";
import { toUUID } from "#backend/lib/mongo";
import { Keys } from "#backend/services/keys";
import { InviteDetails, MemberDetails, Memberships } from "#backend/services/memberships";
import { Roles } from "#backend/services/roles";
import { ORPCError } from "@orpc/server";
import { getExplorerTree } from "./get-explorer-tree";

type ViewerAccess =
  | {
      type: "session";
      workspaceID: string;
      subscriptionPlan: string;
      session: {
        memberID: string;
        userID: string;
        roleID: string;
        permissions: Permission[];
        admin: boolean;
      };
    }
  | {
      type: "key";
      workspaceID: string;
      subscriptionPlan: string;
      key: {
        keyID: string;
        permissions: KeyPermission[];
      };
    };

interface WorkspaceSummary {
  id: string;
  name: string;
}

interface WorkspaceMetadata {
  viewer: ViewerAccess;
  workspace?: WorkspaceSummary;
  entries?: Entry[];
  collections?: Collection[];
  memberships?: MemberDetails[];
  invites?: InviteDetails[];
  roles?: Role[];
  keys?: Key[];
}

const canAccess = (
  auth: SessionData,
  required: {
    session?: Permission[] | true;
    key?: KeyPermission[] | true;
  }
): boolean => {
  if (auth.type === "session" && auth.session?.admin) {
    return true;
  }

  const requiredPermissions = required[auth.type];

  if (!requiredPermissions) {
    return false;
  }

  if (requiredPermissions === true) {
    return true;
  }

  const grantedPermissions = (auth[auth.type]?.permissions || []) as string[];

  return requiredPermissions.every((permission) => {
    return grantedPermissions.some((grantedPermission) => {
      return hasPermission(grantedPermission, permission);
    });
  });
};

const canReadEntries = (auth: SessionData) => {
  return canAccess(auth, {
    session: ["content"],
    key: ["read:entries"]
  });
};

const canReadCollections = (auth: SessionData) => {
  return canAccess(auth, {
    session: ["content"],
    key: ["read:collections"]
  });
};

const canReadMemberships = (auth: SessionData) => {
  return canAccess(auth, {
    session: ["content"],
    key: ["read:memberships"]
  });
};

const canReadInvites = (auth: SessionData) => {
  return canAccess(auth, {
    session: ["content"],
    key: ["memberships"]
  });
};

const canReadRoles = (auth: SessionData) => {
  return canAccess(auth, {
    session: ["content"],
    key: ["read:roles"]
  });
};

const canReadKeys = (auth: SessionData) => {
  return canAccess(auth, {
    session: ["workspace"]
  });
};

const canReadWorkspace = (auth: SessionData) => {
  return canAccess(auth, {
    session: true
  });
};

const canReadViewer = (auth: SessionData) => {
  return auth.type === "session" || auth.type === "key";
};

const getViewerAccess = (auth: SessionData): ViewerAccess => {
  if (auth.type === "session") {
    if (!auth.session) {
      throw new ORPCError("UNAUTHORIZED");
    }

    return {
      type: "session",
      workspaceID: auth.workspaceID,
      subscriptionPlan: auth.subscriptionPlan,
      session: {
        memberID: auth.session.memberID,
        userID: auth.session.userID,
        roleID: auth.session.roleID,
        permissions: auth.session.permissions,
        admin: auth.session.admin === true
      }
    };
  }

  if (!auth.key) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return {
    type: "key",
    workspaceID: auth.workspaceID,
    subscriptionPlan: auth.subscriptionPlan,
    key: {
      keyID: auth.key.keyID,
      permissions: auth.key.permissions
    }
  };
};

const getWorkspaceSummary = async (workspaceID: string): Promise<WorkspaceSummary> => {
  const workspace = await workspacesDB.findOne({
    _id: toUUID(workspaceID)
  });

  if (!workspace) {
    throw new ORPCError("NOT_FOUND", {
      message: "Workspace not found"
    });
  }

  return {
    id: toWorkspaceID(workspace._id),
    name: workspace.name
  };
};

const getWorkspaceMetadata = async (input: { auth: SessionData }): Promise<WorkspaceMetadata> => {
  const { auth } = input;
  const metadata: WorkspaceMetadata = {
    viewer: getViewerAccess(auth)
  };

  const shouldLoadEntries = canReadEntries(auth);
  const shouldLoadCollections = canReadCollections(auth);
  const shouldLoadWorkspace = canReadWorkspace(auth);
  const shouldLoadMemberships = canReadMemberships(auth);
  const shouldLoadInvites = canReadInvites(auth);
  const shouldLoadRoles = canReadRoles(auth);
  const shouldLoadKeys = canReadKeys(auth);

  const tasks: Promise<void>[] = [];

  if (shouldLoadEntries || shouldLoadCollections) {
    tasks.push(
      getExplorerTree({ workspaceID: auth.workspaceID }).then((explorerTree) => {
        if (shouldLoadEntries) {
          metadata.entries = explorerTree.entries;
        }

        if (shouldLoadCollections) {
          metadata.collections = explorerTree.collections;
        }
      })
    );
  }

  if (shouldLoadWorkspace) {
    tasks.push(
      getWorkspaceSummary(auth.workspaceID).then((workspace) => {
        metadata.workspace = workspace;
      })
    );
  }

  if (shouldLoadMemberships) {
    tasks.push(
      Memberships.list({ workspaceID: auth.workspaceID }).then((memberships) => {
        metadata.memberships = memberships;
      })
    );
  }

  if (shouldLoadInvites) {
    tasks.push(
      Memberships.listInvites({ workspaceID: auth.workspaceID }).then((invites) => {
        metadata.invites = invites;
      })
    );
  }

  if (shouldLoadRoles) {
    tasks.push(
      Roles.list({ workspaceID: auth.workspaceID }).then((roles) => {
        metadata.roles = roles;
      })
    );
  }

  if (shouldLoadKeys) {
    tasks.push(
      Keys.list({ workspaceID: auth.workspaceID }).then((keys) => {
        metadata.keys = keys;
      })
    );
  }

  await Promise.all(tasks);

  return metadata;
};

const isWorkspaceEventVisible = (
  auth: SessionData,
  event: {
    action: string;
  }
) => {
  if (event.action.startsWith("entry:")) {
    return canReadEntries(auth);
  }

  if (event.action.startsWith("collection:")) {
    return canReadCollections(auth);
  }

  if (event.action.startsWith("membership:")) {
    return canReadMemberships(auth);
  }

  if (event.action.startsWith("invite:")) {
    return canReadInvites(auth);
  }

  if (event.action.startsWith("role:")) {
    return canReadRoles(auth);
  }

  if (event.action.startsWith("key:")) {
    return canReadKeys(auth);
  }

  if (event.action.startsWith("workspace:")) {
    return canReadWorkspace(auth);
  }

  return false;
};

export {
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
};
export type { ViewerAccess, WorkspaceMetadata, WorkspaceSummary };
