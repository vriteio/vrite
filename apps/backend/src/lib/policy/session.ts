import {
  keyPermissionType,
  permissionType,
  type KeyPermission,
  type Permission
} from "#backend/db";
import type { WorkspaceEvent } from "#backend/events";
import * as z from "zod";

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

const sessionDataBaseType = z.object({
  id: z.string(),
  workspaceID: z.string(),
  subscriptionPlan: z.string(),
  customerID: z.string().optional()
});
const sessionDataType: z.ZodType<SessionData> = z.discriminatedUnion("type", [
  sessionDataBaseType.extend({
    type: z.literal("session"),
    session: z.object({
      memberID: z.string(),
      userID: z.string(),
      roleID: z.string(),
      permissions: z.array(permissionType),
      admin: z.boolean().optional()
    })
  }),
  sessionDataBaseType.extend({
    type: z.literal("key"),
    key: z.object({
      keyID: z.string(),
      permissions: z.array(keyPermissionType)
    })
  })
]);

const getUserSessionCacheKey = (userID: string, workspaceID: string) => {
  return `session:user:${userID}:${workspaceID}`;
};
const parseSessionData = (serialized: string): SessionData | null => {
  try {
    const result = sessionDataType.safeParse(JSON.parse(serialized));

    return result.success ? result.data : null;
  } catch {
    return null;
  }
};
const isSessionAuthorizationEvent = (auth: SessionData, event: WorkspaceEvent): boolean => {
  if (auth.type !== "session" || !auth.session) return false;

  if (event.action === "membership:update" || event.action === "membership:remove") {
    return event.data.id === auth.session.memberID;
  }

  if (event.action === "role:delete") return event.data.id === auth.session.roleID;

  return (
    event.action === "role:update" &&
    event.data.permissions !== undefined &&
    event.data.id === auth.session.roleID
  );
};

export { getUserSessionCacheKey, isSessionAuthorizationEvent, parseSessionData, sessionDataType };
export type { SessionData };
