import { auth } from "#backend/lib/auth";
import {
  membershipDB,
  toMembershipID,
  toRoleID,
  rolesDB,
  toUserID,
  usersDB,
  toWorkspaceID,
  workspacesDB
} from "#backend/db";
import type { KeyPermission, Permission } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { redis } from "#backend/lib/redis";
import { Keys } from "#backend/services/keys";
import { ORPCError } from "@orpc/server";

const SESSION_TTL = 300; // 5 minutes

interface SessionData {
  id: string;
  type: "key" | "session";
  workspaceID: string;
  subscriptionPlan: string;
  customerID?: string;
  session?: {
    memberID: string;
    userID: string;
    roleID: string;
    permissions: Permission[];
    admin?: boolean;
  };
  key?: {
    keyID: string;
    permissions: KeyPermission[];
  };
}

interface GetSessionDataOptions {
  requireWorkspace?: boolean;
}

const getSessionData = async (
  headers: Headers,
  options: GetSessionDataOptions = {}
): Promise<SessionData> => {
  const authHeader = headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return getKeySessionData(headers);
  }

  return getUserSessionData(headers, options);
};
const tryResolveObjectID = (id: string | undefined | null) => {
  if (!id) return null;

  try {
    return toObjectID(id);
  } catch {
    return null;
  }
};
const getUserSessionCacheKey = (userID: string, workspaceID: string) => {
  return `session:user:${userID}:${workspaceID}`;
};
const getUserSessionData = async (
  headers: Headers,
  options: GetSessionDataOptions = {}
): Promise<SessionData> => {
  const { session } =
    (await auth.api.getSession({
      headers
    })) || {};

  if (!session) throw new ORPCError("UNAUTHORIZED");

  const userID = toObjectID(session.userId);
  const user = await usersDB.findOne({ _id: userID });

  if (!user) throw new ORPCError("UNAUTHORIZED");

  const basicSessionData = (): SessionData => ({
    id: `session:user:${session.userId}:no-workspace`,
    type: "session",
    subscriptionPlan: "free",
    workspaceID: "",
    session: {
      userID: toUserID(user._id),
      memberID: "",
      roleID: "",
      permissions: [],
      admin: false
    }
  });
  const requestedWorkspaceID = tryResolveObjectID(headers.get("x-workspace-id"));
  const fallbackWorkspaceID =
    typeof user.currentWorkspaceID === "string"
      ? tryResolveObjectID(user.currentWorkspaceID)
      : user.currentWorkspaceID || null;
  const resolvedWorkspaceID = requestedWorkspaceID || fallbackWorkspaceID;

  if (options.requireWorkspace === false) {
    return basicSessionData();
  }

  if (!resolvedWorkspaceID) {
    throw new ORPCError("UNAUTHORIZED");
  }

  // Try cache first
  const cacheKey = getUserSessionCacheKey(session.userId, resolvedWorkspaceID.toHexString());
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached) as SessionData;
  }

  const workspace = await workspacesDB.findOne({ _id: resolvedWorkspaceID });

  if (!workspace) throw new ORPCError("UNAUTHORIZED");

  const membership = await membershipDB.findOne({
    userID,
    workspaceID: resolvedWorkspaceID
  });

  if (!membership) throw new ORPCError("UNAUTHORIZED");

  const role = await rolesDB.findOne({ _id: membership.roleID });

  if (!role) throw new ORPCError("UNAUTHORIZED");

  const sessionData: SessionData = {
    id: cacheKey,
    type: "session",
    subscriptionPlan: workspace.subscriptionPlan || "free",
    customerID: workspace.customerID,
    workspaceID: toWorkspaceID(workspace._id),
    session: {
      userID: toUserID(user._id),
      memberID: toMembershipID(membership._id),
      roleID: toRoleID(membership.roleID),
      permissions: role.permissions,
      admin: role.baseRole === "admin"
    }
  };

  await redis.set(cacheKey, JSON.stringify(sessionData), { EX: SESSION_TTL });

  return sessionData;
};
const getKeySessionData = async (headers: Headers): Promise<SessionData> => {
  const bearerKey = headers.get("authorization")!.slice(7).trim();
  const key = await Keys.verify(bearerKey);

  if (!key) throw new ORPCError("UNAUTHORIZED");

  const keyID = key.id.toHexString();
  const cacheKey = `session:key:${keyID}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached) as SessionData;
  }

  const workspace = await workspacesDB.findOne({ _id: key.workspaceID });

  if (!workspace) throw new ORPCError("UNAUTHORIZED");

  const sessionData: SessionData = {
    id: cacheKey,
    type: "key",
    subscriptionPlan: workspace.subscriptionPlan || "free",
    customerID: workspace.customerID,
    workspaceID: toWorkspaceID(workspace._id),
    key: {
      keyID,
      permissions: key.permissions
    }
  };

  await redis.set(cacheKey, JSON.stringify(sessionData), { EX: SESSION_TTL });

  return sessionData;
};

export { getSessionData, getUserSessionCacheKey };
export type { SessionData };
