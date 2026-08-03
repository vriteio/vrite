import { getSessionData } from "./get-session-data";
import { invalidateSessionData } from "./invalidate-session-data";

const Auth = {
  getSessionData,
  invalidateSessionData
};

export { Auth };
export type { SessionData } from "#backend/lib/policy";
