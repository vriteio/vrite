import { redis } from "#backend/lib/redis";
import { SessionData } from "./session-data";

const getSession = async (sessionID: string) => {
  const session = await redis.get(`session:${sessionID}`);

  if (!session) return null;

  return JSON.parse(session) as SessionData;
};

export { getSession };
