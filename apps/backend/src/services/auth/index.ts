import { createOTPToken } from "./create-otp-token";
import { verifyOTPToken } from "./verify-otp-token";
import { getSessionData } from "./get-session-data";
import { invalidateSessionData } from "./invalidate-session-data";
import { isSessionAuthorizationEvent } from "./is-session-authorization-event";

const Auth = {
  createOTPToken,
  verifyOTPToken,
  getSessionData,
  invalidateSessionData
};

export { Auth, isSessionAuthorizationEvent };
export type { SessionData } from "./get-session-data";
