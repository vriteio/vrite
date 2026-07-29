import { toUUID } from "#backend/lib/id";
import { redis } from "#backend/lib/redis";
import { getUserSessionCacheKey, SessionData } from "./get-session-data";

/**
 * Invalidate cached session data for a specific user in a workspace.
 */
const invalidateUserSessionData = async (input: {
  userID: string;
  workspaceID: string;
}): Promise<void> => {
  const userUUID = toUUID(input.userID);
  const cacheKey = getUserSessionCacheKey(
    userUUID.toString(),
    toUUID(input.workspaceID).toString()
  );

  await redis.del(cacheKey);
};

/**
 * Invalidate cached session data for a specific API key.
 */
const invalidateKeySessionData = async (keyID: string): Promise<void> => {
  const cacheKey = `session:key:${toUUID(keyID).toString()}`;

  await redis.del(cacheKey);
};

/**
 * Invalidate all cached session data for a workspace (sessions + keys).
 * Uses SCAN to avoid blocking Redis.
 */
const invalidateWorkspaceSessionData = async (workspaceID: string): Promise<void> => {
  const wsUUID = toUUID(workspaceID).toString();
  const patterns = [`session:user:*:${wsUUID}`, `session:key:*`];

  for (const pattern of patterns) {
    for await (const keys of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      const batch = Array.isArray(keys) ? keys : [keys];

      for (const key of batch) {
        // For key sessions, filter by checking the cached workspace
        if (pattern.startsWith("session:key:")) {
          const cached = await redis.get(key);

          if (cached) {
            const data = JSON.parse(cached) as SessionData;

            if (data.workspaceID === workspaceID) {
              await redis.del(key);
            }
          }
        } else {
          await redis.del(key);
        }
      }
    }
  }
};
const invalidateSessionData = async (
  input:
    | {
        userID: string;
        workspaceID: string;
      }
    | {
        keyID: string;
      }
    | {
        workspaceID: string;
      }
) => {
  if ("userID" in input && "workspaceID" in input) {
    await invalidateUserSessionData(input);
  } else if ("keyID" in input) {
    await invalidateKeySessionData(input.keyID);
  } else if ("workspaceID" in input) {
    await invalidateWorkspaceSessionData(input.workspaceID);
  }
};

export { invalidateSessionData };
