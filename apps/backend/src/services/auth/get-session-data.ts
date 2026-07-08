import { auth } from "#backend/lib/auth";
import {
  membershipDB,
  toMembershipID,
  toRoleID,
  toKeyID,
  rolesDB,
  toUserID,
  usersDB,
  toWorkspaceID,
  workspacesDB
} from "#backend/db";
import type { KeyPermission, Permission } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
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
const tryResolveUUID = (id: string | undefined | null) => {
  if (!id) return null;

  try {
    return toUUID(id);
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

  const userID = toUUID(session.userId);
  const user =
    (await usersDB.findOne({ _id: userID })) ||
    (await usersDB.findOne({ _id: session.userId as any }));

  if (!user) throw new ORPCError("UNAUTHORIZED");

  const basicSessionData = (): SessionData => ({
    id: `session:user:${session.userId}:no-workspace`,
    type: "session",
    subscriptionPlan: "free",
    workspaceID: "",
    session: {
      userID: toUserID(userID),
      memberID: "",
      roleID: "",
      permissions: [],
      admin: false
    }
  });
  const requestedWorkspaceID = tryResolveUUID(headers.get("x-workspace-id"));
  const fallbackWorkspaceID =
    typeof user.currentWorkspaceID === "string"
      ? tryResolveUUID(user.currentWorkspaceID)
      : user.currentWorkspaceID || null;
  const resolvedWorkspaceID = requestedWorkspaceID || fallbackWorkspaceID;

  if (options.requireWorkspace === false) {
    return basicSessionData();
  }

  if (!resolvedWorkspaceID) {
    throw new ORPCError("UNAUTHORIZED");
  }

  // Try cache first
  const cacheKey = getUserSessionCacheKey(session.userId, resolvedWorkspaceID.toString());
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
      userID: toUserID(userID),
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

  const keyUUID = key.id;
  const cacheKey = `session:key:${keyUUID.toString()}`;
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
      keyID: toKeyID(keyUUID),
      permissions: key.permissions
    }
  };

  await redis.set(cacheKey, JSON.stringify(sessionData), { EX: SESSION_TTL });

  return sessionData;
};

export { getSessionData, getUserSessionCacheKey };
export type { SessionData };
