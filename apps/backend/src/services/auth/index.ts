import { createOTPToken } from "./create-otp-token";
import { verifyOTPToken } from "./verify-otp-token";
import { getSessionData } from "./get-session-data";
import { invalidateSessionData } from "./invalidate-session-data";

const Auth = {
  createOTPToken,
  verifyOTPToken,
  getSessionData,
  invalidateSessionData
};

export { Auth };
export type { SessionData } from "./get-session-data";
