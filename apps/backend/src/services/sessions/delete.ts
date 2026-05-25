import { redis } from "#backend/lib/redis";
import { SessionData } from "./session-data";

const deleteSession = async (sessionID: string) => {
  const session = await redis.get(`session:${sessionID}`);

  if (!session) return;

  const sessionData = JSON.parse(session) as SessionData;
  const promises: Array<Promise<any>> = [];

  promises.push(
    redis.del(`session:${sessionID}`),
    redis.sRem(`user:${sessionData.userID}:sessions`, sessionID),
    redis.sRem(`workspace:${sessionData.workspaceID}:sessions`, sessionID)
  );

  if (sessionData.roleID) {
    promises.push(redis.sRem(`role:${sessionData.roleID}:sessions`, sessionID));
  }

  promises.push(redis.hDel("session:user", sessionID), redis.hDel("session:workspace", sessionID));

  if (sessionData.roleID) {
    promises.push(redis.hDel("session:role", sessionID));
  }

  await Promise.all(promises);
};

export { deleteSession };
