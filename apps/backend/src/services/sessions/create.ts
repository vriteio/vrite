import { redis } from "#backend/lib/redis";
import { bytesToHex } from "#backend/lib/utils";
import dayjs from "dayjs";
import { getSessionData } from "./session-data";

const createSession = async (input: {
  userID: string;
  workspaceID?: string;
}): Promise<{ sessionID: string; expireAt: Date }> => {
  const sessionID = bytesToHex(crypto.getRandomValues(new Uint8Array(20)));
  // 30 days
  const expireAt = dayjs().add(30, "day").toDate();
  const sessionData = await getSessionData({
    userID: input.userID,
    workspaceID: input.workspaceID
  });

  await redis.set(`session:${sessionID}`, JSON.stringify({ ...sessionData }), {
    EXAT: dayjs(expireAt).unix()
  });
  // Sets for session lookup by user, workspace, and role
  await redis.sAdd(`workspace:${sessionData.workspaceID}:sessions`, sessionID);
  await redis.sAdd(`user:${sessionData.userID}:sessions`, sessionID);

  if (sessionData.roleID) {
    await redis.sAdd(`role:${sessionData.roleID}:sessions`, sessionID);
  }

  // Hashmaps for getting user, workspace, and role ids by session id (for use when deleting sessions)
  await redis.hSet(`session:user`, sessionID, sessionData.userID);
  await redis.hSet(`session:workspace`, sessionID, sessionData.workspaceID);

  if (sessionData.roleID) {
    await redis.hSet(`session:role`, sessionID, sessionData.roleID);
  }

  return { sessionID, expireAt };
};

export { createSession };
