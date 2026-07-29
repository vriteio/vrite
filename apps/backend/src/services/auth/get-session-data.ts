import { memberships, roles, users, workspaces } from "#backend/db";
import type { KeyPermission, Permission } from "#backend/db";
import { auth } from "#backend/lib/auth";
import {
  toKeyID,
  toMembershipID,
  toRoleID,
  toUserID,
  toUUID,
  toWorkspaceID
} from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { redis } from "#backend/lib/redis";
import { Keys } from "#backend/services/keys";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const SESSION_TTL = 300;
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
  key?: { keyID: string; permissions: KeyPermission[] };
}
interface GetSessionDataOptions {
  requireWorkspace?: boolean;
}

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
const getSessionData = async (
  headers: Headers,
  options: GetSessionDataOptions = {}
): Promise<SessionData> => {
  if (headers.get("authorization")?.startsWith("Bearer ")) {
    return getKeySessionData(headers);
  }

  return getUserSessionData(headers, options);
};
const getUserSessionData = async (
  headers: Headers,
  options: GetSessionDataOptions
): Promise<SessionData> => {
  const sessionResult = await auth.api.getSession({ headers });
  const session = sessionResult?.session;

  if (!session) throw new ORPCError("UNAUTHORIZED");

  const userID = toUUID(session.userId);
  const [user] = await db.select().from(users).where(eq(users.id, userID));

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

  if (options.requireWorkspace === false) return basicSessionData();

  const workspaceID =
    tryResolveUUID(headers.get("x-workspace-id")) || user.currentWorkspaceID || null;

  if (!workspaceID) throw new ORPCError("UNAUTHORIZED");

  const cacheKey = getUserSessionCacheKey(session.userId, workspaceID);
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached) as SessionData;

  const [row] = await db
    .select({
      workspaceID: workspaces.id,
      subscriptionPlan: workspaces.subscriptionPlan,
      customerID: workspaces.customerID,
      memberID: memberships.id,
      roleID: roles.id,
      permissions: roles.permissions,
      baseRole: roles.baseRole
    })
    .from(memberships)
    .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceID))
    .innerJoin(roles, eq(roles.id, memberships.roleID))
    .where(and(eq(memberships.userID, userID), eq(memberships.workspaceID, workspaceID)));

  if (!row) throw new ORPCError("UNAUTHORIZED");

  const data: SessionData = {
    id: cacheKey,
    type: "session",
    subscriptionPlan: row.subscriptionPlan,
    customerID: row.customerID || undefined,
    workspaceID: toWorkspaceID(row.workspaceID),
    session: {
      userID: toUserID(userID),
      memberID: toMembershipID(row.memberID),
      roleID: toRoleID(row.roleID),
      permissions: row.permissions,
      admin: row.baseRole === "admin"
    }
  };

  await redis.set(cacheKey, JSON.stringify(data), { EX: SESSION_TTL });

  return data;
};
const getKeySessionData = async (headers: Headers): Promise<SessionData> => {
  const key = await Keys.verify(headers.get("authorization")!.slice(7).trim());

  if (!key) throw new ORPCError("UNAUTHORIZED");

  const cacheKey = `session:key:${key.id}`;
  const cached = await redis.get(cacheKey);

  if (cached) return JSON.parse(cached) as SessionData;

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, key.workspaceID));

  if (!workspace) throw new ORPCError("UNAUTHORIZED");

  const data: SessionData = {
    id: cacheKey,
    type: "key",
    subscriptionPlan: workspace.subscriptionPlan,
    customerID: workspace.customerID || undefined,
    workspaceID: toWorkspaceID(workspace.id),
    key: { keyID: toKeyID(key.id), permissions: key.permissions }
  };

  await redis.set(cacheKey, JSON.stringify(data), { EX: SESSION_TTL });

  return data;
};

export { getSessionData, getUserSessionCacheKey };
export type { SessionData };
